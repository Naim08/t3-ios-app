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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  const handleSend = useCallback(async () => {
    if (inputText.trim().length === 0 || isStreaming) return;

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

  const renderEmptyState = () => <EmptyState />;
  
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <Surface elevation={1} style={styles.header}>
          <View style={styles.headerContent}>
            <Typography
              variant="h4"
              weight="semibold"
              style={styles.headerTitle}
            >
              AI Assistant
            </Typography>
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
            style={[styles.modelSelector, {
              backgroundColor: theme.colors.brand['100'],
              borderColor: theme.colors.brand['300'],
              borderWidth: 1,
            }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('models.selectModel')}
            accessibilityHint={t('models.selectModelHint')}
          >
            <Typography
              variant="bodySm"
              color={theme.colors.brand['600']}
              align="center"
              weight="semibold"
            >
              {currentModel} ▼
            </Typography>
          </TouchableOpacity>
        </Surface>
      </SafeAreaView>

      {/* Messages List */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent,
            { paddingBottom: 16 }
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
        />
        <Surface 
          elevation={3} 
          style={{
            ...styles.inputBar,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <View style={styles.inputContainer}>
            {streamError && (
              <View style={styles.errorContainer}>
                <Typography variant="bodySm" color={theme.colors.danger['600']}>
                  {streamError}
                </Typography>
                <TouchableOpacity onPress={retryStream} style={styles.retryButton}>
                  <Typography variant="bodySm" color={theme.colors.brand['500']}>
                    Retry
                  </Typography>
                </TouchableOpacity>
              </View>
            )}
            <TextField
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              multiline
              numberOfLines={3}
              style={styles.textInput}
              inputStyle={styles.textInputStyle}
              editable={!isStreaming}
              autoFocus={false}
              onFocus={() => {
                // Scroll to bottom when input is focused
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim().length > 0 && !isStreaming
                    ? theme.colors.brand['500']
                    : theme.colors.gray['300'],
                },
              ]}
              onPress={isStreaming ? abortStream : handleSend}
              disabled={inputText.trim().length === 0 && !isStreaming}
              activeOpacity={0.7}
            >
              <Typography
                variant="bodyMd"
                color="#FFFFFF"
                align="center"
              >
                {isStreaming ? '⏹' : '➤'}
              </Typography>
            </TouchableOpacity>
          </View>
        </Surface>
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
  headerSafeArea: {
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    flex: 1,
    marginBottom: 4,
  },
  modelSelector: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
  },
  textInputStyle: {
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4, // Align with text input bottom
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inputKeyboardView: {
    // set inpput keyboard to bottom of screen and under text input
   
  },
});
