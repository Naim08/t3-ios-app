import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ListRenderItem,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Conditional imports for gradients
let LinearGradient, BlurView;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
  const blurLib = require('expo-blur');
  BlurView = blurLib.BlurView;
} catch (error) {
  console.warn('Gradient/Blur libraries not available, using fallback components');
  LinearGradient = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);
  BlurView = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);
}
import { useTheme } from '../components/ThemeProvider';
import { Typography, TextField, Surface } from '../ui/atoms';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from './EmptyState';
import { Message, mockMessages, StreamMessage } from './types';
import { SimpleModelPicker } from '../models/SimpleModelPicker';
import { CreditsDisplay } from '../credits/CreditsDisplay';
import { useEntitlements } from '../hooks/useEntitlements';
import { useCredits } from '../hooks/useCredits';
import { useStream } from './useStream';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface ChatScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isSubscriber, hasCustomKey } = useEntitlements();
  const { remaining: remainingTokens, refetch: refetchCredits } = useCredits();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputText, setInputText] = useState('');
  const [isModelPickerVisible, setIsModelPickerVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState('gpt-3.5');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;

  // Keyboard listeners for better input positioning
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Auto scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  const { 
    isStreaming, 
    streamingText, 
    error: streamError, 
    startStream, 
    abortStream,
    retryStream 
  } = useStream({
    onTokenSpent: () => {
      // Tokens are spent automatically by the gateway
      refetchCredits();
    },
    onError: (error) => {
      console.error('Stream error:', error);
      // Remove the streaming message on error
      if (streamingMessageId) {
        setMessages(prev => prev.filter(m => m.id !== streamingMessageId));
        setStreamingMessageId(null);
      }
    },
    onComplete: (usage) => {
      if (streamingMessageId && streamingText) {
        // Finalize the streaming message
        setMessages(prev => prev.map(m => 
          m.id === streamingMessageId 
            ? { ...m, text: streamingText, isStreaming: false }
            : m
        ));
      }
      setStreamingMessageId(null);
      refetchCredits();
      console.log('Stream completed with usage:', usage);
    }
  });

  // Update streaming message text in real-time
  React.useEffect(() => {
    if (streamingMessageId && streamingText) {
      setMessages(prev => prev.map(m => 
        m.id === streamingMessageId 
          ? { ...m, text: streamingText }
          : m
      ));
    }
  }, [streamingMessageId, streamingText]);

  // Typing indicator animation
  React.useEffect(() => {
    if (isStreaming) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnimation.setValue(0);
    }
  }, [isStreaming]);

  // Send button animation on press
  const animateSendButton = () => {
    Animated.sequence([
      Animated.spring(sendButtonScale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
    ]).start();
  };

  const handleSend = useCallback(async () => {
    if (inputText.trim().length === 0 || isStreaming) return;
    
    animateSendButton();

    // Check if user has access to the selected model
    const isModelPremium = currentModel !== 'gpt-3.5' && currentModel !== 'gemini-pro';
    const hasAccess = isModelPremium ? (isSubscriber || hasCustomKey) : true;
    
    if (!hasAccess) {
      navigation.navigate('Paywall');
      return;
    }

    // For free models, check token balance
    if (!isModelPremium && remainingTokens <= 0) {
      navigation.navigate('Paywall');
      return;
    }

    const userMessage: Message = {
      id: `m${Date.now()}`,
      role: 'user',
      text: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    // Create placeholder assistant message for streaming
    const assistantMessageId = `m${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      text: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setStreamingMessageId(assistantMessageId);
    
    const messageText = inputText.trim();
    setInputText('');

    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Prepare messages for the stream
    const streamMessages: StreamMessage[] = [
      ...messages.map(m => ({ role: m.role, content: m.text })),
      { role: 'user', content: messageText }
    ];

    try {
      await startStream({
        model: currentModel,
        messages: streamMessages,
        customApiKey: hasCustomKey ? undefined : undefined, // TODO: Get from user settings
      });
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  }, [inputText, currentModel, isSubscriber, hasCustomKey, remainingTokens, navigation, messages, isStreaming, startStream, streamingMessageId]);

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <MessageBubble message={item} />
  );

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  const renderEmptyState = () => <EmptyState onSuggestionPress={handleSuggestionPress} />;
  
  const handleModelSelect = (modelId: string) => {
    console.log(`Selected model: ${modelId}`);
    setCurrentModel(modelId);
  };
  
  const handleNavigateToPaywall = () => {
    navigation.navigate('Paywall');
  };

  // Debug model selection state
  React.useEffect(() => {
    console.log(`ModelPicker visibility: ${isModelPickerVisible}`);
    console.log(`Current model: ${currentModel}`);
  }, [isModelPickerVisible, currentModel]);

  // Model info for display
  const getModelDisplayInfo = (modelId: string) => {
    const models = {
      'gpt-3.5': { name: 'GPT-3.5', icon: '🤖', color: theme.colors.brand['500'] },
      'gpt-4o': { name: 'GPT-4o', icon: '⚡', color: theme.colors.brand['600'] },
      'claude-sonnet': { name: 'Claude', icon: '🎭', color: theme.colors.accent['600'] },
      'gemini-pro': { name: 'Gemini', icon: '💎', color: theme.colors.accent['500'] },
    };
    return models[modelId] || { name: modelId, icon: '🤖', color: theme.colors.brand['500'] };
  };

  const modelInfo = getModelDisplayInfo(currentModel);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={[
          theme.colors.brand['500'] + '08',
          theme.colors.accent['500'] + '05',
          theme.colors.background,
        ]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <Animated.View
          style={[
            {
              opacity: scrollY.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0.98],
                extrapolate: 'clamp',
              }),
              transform: [{
                translateY: scrollY.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, -2],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        >
          <BlurView intensity={80} style={styles.headerBlur}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.titleRow}>
                  <Typography
                    variant="h3"
                    weight="bold"
                    style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
                  >
                    Pocket T3
                  </Typography>
                  <View style={styles.headerBadge}>
                    <Typography variant="caption" color={theme.colors.brand['600']}>
                      AI Chat
                    </Typography>
                  </View>
                </View>
                <CreditsDisplay 
                  compact 
                  onPress={() => navigation.navigate('CreditsPurchase')} 
                />
              </View>
              
              <TouchableOpacity 
                onPress={() => {
                  console.log('Opening model picker...');
                  setIsModelPickerVisible(true);
                }}
                style={[
                  styles.modelSelector,
                  {
                    backgroundColor: modelInfo.color + '15',
                    borderColor: modelInfo.color + '30',
                  }
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('models.selectModel')}
                accessibilityHint={t('models.selectModelHint')}
              >
                <View style={styles.modelSelectorContent}>
                  <Typography variant="h4" style={{ marginRight: 8 }}>
                    {modelInfo.icon}
                  </Typography>
                  <Typography
                    variant="bodyMd"
                    weight="semibold"
                    style={{ color: modelInfo.color }}
                  >
                    {modelInfo.name}
                  </Typography>
                  <Typography
                    variant="bodySm"
                    style={{ color: modelInfo.color, marginLeft: 4 }}
                  >
                    ▼
                  </Typography>
                </View>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </SafeAreaView>

      {/* Content with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <View style={{ flex: 1 }}>
          <Animated.FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 && styles.emptyContent,
              { paddingBottom: 8 } // Reduced padding
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          />
        </View>

        {/* Input Bar */}
        <BlurView intensity={90} style={styles.inputBarBlur}>
          <LinearGradient
            colors={[
              theme.colors.surface + 'F8',
              theme.colors.surface + 'FA',
            ]}
            style={[
              styles.inputBar,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            {/* Typing Indicator */}
            {isStreaming && (
              <Animated.View
                style={[
                  styles.typingIndicator,
                  {
                    opacity: typingAnimation,
                    transform: [{
                      scale: typingAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    }],
                  },
                ]}
              >
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, { marginLeft: 4 }]} />
                <View style={[styles.typingDot, { marginLeft: 4 }]} />
              </Animated.View>
            )}
            
            <View style={styles.inputContainer}>
              {streamError && (
                <View style={[styles.errorContainer, { backgroundColor: theme.colors.danger['500'] + '15' }]}>
                  <Typography variant="bodySm" color={theme.colors.danger['600']}>
                    {streamError}
                  </Typography>
                  <TouchableOpacity onPress={retryStream} style={styles.retryButton}>
                    <Typography variant="bodySm" color={theme.colors.brand['500']} weight="semibold">
                      Retry
                    </Typography>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.inputWrapper}>
                <TextField
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={isStreaming ? "AI is typing..." : "Type your message..."}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.gray['50'],
                      borderColor: inputText ? theme.colors.brand['300'] : theme.colors.border,
                    },
                  ]}
                  inputStyle={styles.textInputStyle}
                  editable={!isStreaming}
                  autoFocus={false}
                  onFocus={() => {
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
                
                <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: inputText.trim().length > 0 && !isStreaming
                          ? theme.colors.brand['500']
                          : isStreaming
                          ? theme.colors.danger['500']
                          : theme.colors.gray['300'],
                      },
                    ]}
                    onPress={isStreaming ? abortStream : handleSend}
                    disabled={inputText.trim().length === 0 && !isStreaming}
                    activeOpacity={0.7}
                  >
                    {isStreaming ? (
                      <Typography variant="h4">⏹</Typography>
                    ) : (
                      <LinearGradient
                        colors={[
                          inputText.trim().length > 0 ? theme.colors.brand['400'] : theme.colors.gray['300'],
                          inputText.trim().length > 0 ? theme.colors.brand['600'] : theme.colors.gray['400'],
                        ]}
                        style={styles.sendButtonGradient}
                      >
                        <Typography variant="h4" color="#FFFFFF">
                          ➤
                        </Typography>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </KeyboardAvoidingView>
      
      {/* ModelPickerSheet rendered outside of KeyboardAvoidingView */}
      {isModelPickerVisible && (
        <SimpleModelPicker
          isVisible={true}
          onClose={() => {
            console.log('Closing model picker...');
            setIsModelPickerVisible(false);
          }}
          onSelect={(modelId: string) => {
            console.log(`Selected model: ${modelId}`);
            handleModelSelect(modelId);
          }}
          onNavigateToPaywall={handleNavigateToPaywall}
          remainingTokens={remainingTokens}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  headerSafeArea: {
    backgroundColor: 'transparent',
  },
  headerBlur: {
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: 'rgba(57, 112, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modelSelector: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modelSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  inputBarBlur: {
    // Remove absolute positioning to work with KeyboardAvoidingView
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(57, 112, 255, 0.6)',
  },
  inputContainer: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInputStyle: {
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 22,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 107, 107, 0.5)',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(57, 112, 255, 0.1)',
  },
});
