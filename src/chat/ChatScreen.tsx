import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import { Typography, TextField, Surface, IconButton, AILoadingAnimation } from '../ui/atoms';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from './EmptyState';
import { Message } from './types';
import { ChatSettingsModal, ChatSettingsModalRef } from './ChatSettingsModal';
import { useEntitlements } from '../hooks/useEntitlements';
import { useStream, StreamMessage } from './useStream';
import { useTranslation } from 'react-i18next';
import { usePersona } from '../context/PersonaContext';
import { usePremium } from '../hooks/usePremium';
import { supabase } from '../lib/supabase';
import { isModelPremium } from '../utils/modelUtils';
import { ConversationService } from '../services/conversationService';

const { width } = Dimensions.get('window');


interface ChatScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    setOptions: (options: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      personaId?: string;
      conversationId?: string;
    };
  };
}

const ChatScreenComponent: React.FC<ChatScreenProps> = ({ navigation, route }) => {

  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isSubscriber, hasCustomKey, remainingTokens, refreshCredits } = useEntitlements();
  const { currentPersona, setCurrentPersona } = usePersona();
  const { loading: premiumLoading } = usePremium();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentModel, setCurrentModel] = useState<string>('gpt-3.5'); // Will be loaded from storage

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const chatSettingsModalRef = useRef<ChatSettingsModalRef>(null);

  // Component mount/unmount tracking
  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);



  // Load model from conversation or use persona default
  useEffect(() => {
    const loadConversationModel = async () => {
      try {
        if (currentConversationId) {
          // Load model from existing conversation
          const { data: conversation, error } = await supabase
            .from('conversations')
            .select('current_model')
            .eq('id', currentConversationId)
            .single();

          if (!error && conversation?.current_model) {
            if (conversation.current_model !== currentModel) {
              setCurrentModel(conversation.current_model);
            }
            return;
          }
        }

        // For new conversations, use persona's default model
        if (currentPersona && currentPersona.default_model !== currentModel) {
          setCurrentModel(currentPersona.default_model);
        }
      } catch (error) {
        console.error('Failed to load conversation model:', error);
      }
    };

    loadConversationModel();
  }, [currentConversationId, currentPersona?.default_model]); // Re-run when conversation or persona changes

  // Better scroll to bottom function
  const scrollToBottom = useCallback((animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      try {
        flatListRef.current.scrollToEnd({ animated });
      } catch (error) {
        // Fallback: scroll to index
        try {
          flatListRef.current.scrollToIndex({ 
            index: messages.length - 1, 
            animated,
            viewPosition: 1 
          });
        } catch (indexError) {
          // Silent fallback - scrolling is not critical
        }
      }
    }
  }, [messages.length]);

  // Update navigation title when persona changes
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleContent}>
            {currentPersona && (
              <Typography variant="bodyLg" style={{ marginRight: 3 }}>
                {currentPersona.icon}
              </Typography>
            )}
            <Typography
              variant="bodyLg"
              weight="semibold"
              color={theme.colors.textPrimary}
              numberOfLines={1}
              style={styles.headerTitleText}
            >
              {currentPersona?.display_name || 'Chat'}
            </Typography>
          </View>
        </View>
      ),
      headerRight: () => (
        <IconButton
          icon="settings"
          onPress={() => chatSettingsModalRef.current?.present()}
          variant="gradient"
          style={{ marginRight: 10 }}
        />
      )
    });
  }, [currentPersona?.display_name, navigation, theme.colors.textPrimary, theme.colors.brand]);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      // Fetch conversation details using service
      const conversationResult = await ConversationService.fetchConversation(conversationId);
      
      if (conversationResult.error) {
        ConversationService.handleError(conversationResult.error, 'loading conversation');
        return;
      }
      
      const conversation = conversationResult.data;
      if (!conversation) {
        console.error('❌ No conversation data returned');
        return;
      }

      // Fetch messages using service
      const messagesResult = await ConversationService.fetchMessages(conversationId);
      
      if (messagesResult.error) {
        ConversationService.handleError(messagesResult.error, 'loading messages');
        return;
      }

      const messagesData = messagesResult.data || [];
      
      if (messagesData.length === 0) {
        setMessages([]);
      } else {
        // Convert database messages to UI format (keeping existing conversion logic)
        const uiMessages: Message[] = messagesData
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            text: msg.content,
            createdAt: msg.created_at,
          }));

        setMessages(uiMessages);
      }

      // Set the conversation state
      setCurrentConversationId(conversationId);
      setConversationTitle(conversation.title || '');

      // Set model from conversation if available
      if (conversation.current_model) {
        setCurrentModel(conversation.current_model);
      }

      // Always set persona from conversation data to ensure consistency
      if (conversation.personas) {
        // Convert the conversation persona data to match the full Persona interface
        const fullPersona = {
          ...conversation.personas,
          tool_ids: [], // Default empty array since conversation data doesn't include tools
          created_at: new Date().toISOString(), // Default to current time
        };
        setCurrentPersona(fullPersona);
        if (!conversation.current_model) {
          setCurrentModel(conversation.personas.default_model);
        }
      }
      
      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);

    } catch (error) {
      console.error('❌ Unexpected error in loadConversation:', error);
    }
  }, [setCurrentPersona, scrollToBottom]); // Only depend on setCurrentPersona to avoid unnecessary re-creation

  // Load conversation on mount (only for existing conversations)
  useEffect(() => {
    const conversationId = route?.params?.conversationId;
    
    if (conversationId) {
      if (conversationId !== currentConversationId) {
        loadConversation(conversationId);
      }
    }
    // For new conversations, persona is already set by PersonaPickerScreen
  }, [route?.params?.conversationId, currentConversationId, loadConversation]);

  const loadPersona = useCallback(async (personaId: string) => {
    try {
      const { data: persona, error } = await supabase
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();

      if (error) {
        console.error('Error loading persona:', error);
        return;
      }

      if (persona) {
        // Check if persona requires premium and user doesn't have it
        if (persona.requires_premium && !isSubscriber && !hasCustomKey) {
          navigation.navigate('Paywall');
          return;
        }

        setCurrentPersona(persona);
        setCurrentModel(persona.default_model);
        
        // Start fresh conversation for new persona
        setMessages([]);
        setCurrentConversationId(null);
        setConversationTitle('');
      }
    } catch (error) {
      console.error('Error loading persona:', error);
    }
  }, [isSubscriber, hasCustomKey, navigation, setCurrentPersona]);

  // Keyboard listeners for better input positioning
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Auto scroll to bottom when keyboard appears
        setTimeout(() => {
          scrollToBottom(true);
        }, 200);
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
      refreshCredits();
    },
    onError: (error) => {
      console.error('Stream error:', error);
      // Remove the streaming message on error
      if (streamingMessageId) {
        setMessages(prev => prev.filter(m => m.id !== streamingMessageId));
        setStreamingMessageId(null);
      }
    },
    onComplete: async (usage) => {
      if (streamingMessageId) {
        // Just mark the message as no longer streaming - text is already updated by useEffect
        setMessages(prev => prev.map(m => 
          m.id === streamingMessageId 
            ? { ...m, isStreaming: false }
            : m
        ));
        setStreamingMessageId(null);

        // Server now saves the assistant message automatically
        // No manual saving needed for assistant messages
      }
      refreshCredits();
    }
  });

  // Update streaming message text in real-time
  React.useEffect(() => {
    // Only update the message text if we're actively streaming and have a streaming message
    if (streamingMessageId && isStreaming) {
      setMessages(prev => prev.map(m => 
        m.id === streamingMessageId 
          ? { ...m, text: streamingText || '' }
          : m
      ));
    }
  }, [streamingMessageId, streamingText, isStreaming]);

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

  const saveMessage = async (role: 'user' | 'assistant', content: string, messageId?: string): Promise<string> => {
    
    try {
      let conversationId = currentConversationId;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ Error getting user:', userError);
          throw userError;
        }
        
        if (!user) {
          console.error('❌ No authenticated user found');
          throw new Error('No authenticated user');
        }
        
        const conversationData = {
          user_id: user.id,
          persona_id: currentPersona?.id || null,
          title,
          last_message_preview: role === 'user' ? content : null,
          message_count: 0,
          current_model: currentModel, // Save the current model
        };
        
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert(conversationData)
          .select('id')
          .single();

        if (convError) {
          console.error('❌ Error creating conversation:', convError);
          throw convError;
        }

        if (!newConv) {
          console.error('❌ No conversation data returned');
          throw new Error('No conversation created');
        }

        conversationId = newConv.id;
        setCurrentConversationId(conversationId);
        setConversationTitle(title);
      } else {
      }

      // Save message
      const messageData = {
        conversation_id: conversationId,
        role,
        content,
        model_used: role === 'assistant' ? currentModel : null,
      };

      let result;
      if (messageId) {
        // Update existing message (for streaming completion)
        result = await supabase
          .from('messages')
          .update(messageData)
          .eq('id', messageId)
          .select();
      } else {
        // Insert new message
        result = await supabase
          .from('messages')
          .insert(messageData)
          .select();
      }

      if (result.error) {
        console.error(`❌ Database error saving ${role} message:`, result.error);
        throw result.error;
      }

      if (!result.data || result.data.length === 0) {
        console.error('❌ No data returned from message save');
        throw new Error('No message data returned');
      }
      
      // Return the conversation ID for use in streaming
      return conversationId;
      
    } catch (error) {
      console.error(`❌ Error saving ${role} message:`, error);
      throw error; // Re-throw so calling code can handle it
    }
  };

  const handleSend = useCallback(async () => {
    
    if (inputText.trim().length === 0 || isStreaming) {
      return;
    }
    
    animateSendButton();

    // Check if user has access to the selected model using unified logic
    const modelIsPremium = isModelPremium(currentModel);
    
    // For free models, check token balance first
    if (!modelIsPremium && remainingTokens <= 0) {
      navigation.navigate('Paywall');
      return;
    }
    
    // For premium models, check subscription or custom key
    if (modelIsPremium && !isSubscriber && !hasCustomKey) {
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

    // Clear any existing streaming state before adding new messages
    if (streamingMessageId) {
      setMessages(prev => prev.map(m => 
        m.id === streamingMessageId 
          ? { ...m, isStreaming: false }
          : m
      ));
      setStreamingMessageId(null);
    }

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setStreamingMessageId(assistantMessageId);
    
    const messageText = inputText.trim();
    setInputText('');

    // Save user message to database and get the conversation ID
    let actualConversationId: string;
    try {
      actualConversationId = await saveMessage('user', messageText);
    } catch (error) {
      console.error('❌ Failed to save user message:', error);
      // Don't return here - still try to send the message to the AI
      // Fall back to currentConversationId if save failed
      actualConversationId = currentConversationId || '';
    }

    // Auto-scroll to bottom
    setTimeout(() => {
      scrollToBottom(true);
    }, 200);

    // Prepare messages for the stream with persona system prompt
    const streamMessages: StreamMessage[] = [];
    
    // Add persona system prompt if available and not blank chat
    if (currentPersona && currentPersona.system_prompt && currentPersona.id !== 'blank-chat') {
      streamMessages.push({ 
        role: 'system', 
        content: currentPersona.system_prompt 
      });
    }
    
    // Add conversation history
    streamMessages.push(...messages.map(m => ({ role: m.role, content: m.text })));
    
    // Add current user message
    streamMessages.push({ role: 'user', content: messageText });

    try {
      await startStream({
        model: currentModel,
        messages: streamMessages,
        customApiKey: hasCustomKey ? undefined : undefined, // TODO: Get from user settings
        conversationId: actualConversationId,
        personaId: currentPersona?.id,
      });
    } catch (error) {
      console.error('❌ Failed to start stream:', error);
    }
  }, [inputText, currentModel, isSubscriber, hasCustomKey, remainingTokens, navigation, messages, isStreaming, startStream, streamingMessageId, currentConversationId, currentPersona, saveMessage]);

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <MessageBubble message={item} />
  );

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setInputText(suggestion);
  }, []);

  const renderEmptyState = useMemo(() => <EmptyState onSuggestionPress={handleSuggestionPress} />, [handleSuggestionPress]);
  
  const handleModelSelect = async (modelId: string) => {
    setCurrentModel(modelId);
    
    // Save the model to the conversation if it exists
    if (currentConversationId) {
      const result = await ConversationService.updateConversationModel(currentConversationId, modelId);
      
      if (!result.success && result.error) {
        console.warn('Failed to persist model selection:', result.error.message);
        // Don't show error to user - model still works for current session
      }
    }
    // For new conversations, the model will be saved when the conversation is created
  };
  
  const handleNavigateToPaywall = () => {
    navigation.navigate('Paywall');
  };

  const handleNavigateToCredits = () => {
    chatSettingsModalRef.current?.dismiss();
    navigation.navigate('CreditsScreen');
  };

  const handleDeleteConversation = () => {
    chatSettingsModalRef.current?.dismiss();
    navigation.goBack();
  };

  // Prevent rendering until persona is loaded for new conversations
  const isNewConversation = !route?.params?.conversationId;
  const shouldShowLoading = isNewConversation && !currentPersona;
  
  if (shouldShowLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <AILoadingAnimation size={100} />
        <Typography variant="bodyLg" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
          Setting up chat...
        </Typography>
      </View>
    );
  }

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
      

      {/* Content with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={true}
      >
        {/* Messages List */}
        <Animated.FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent,
          ]}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={renderEmptyState}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 100,
          }}
          onContentSizeChange={() => {
            setTimeout(() => {
              scrollToBottom(true);
            }, 100);
          }}
          onLayout={() => {
            setTimeout(() => {
              scrollToBottom(false);
            }, 50);
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // Performance optimizations to prevent jumping
          removeClippedSubviews={false}
          windowSize={10}
          maxToRenderPerBatch={10}
          initialNumToRender={20}
          updateCellsBatchingPeriod={50}
          getItemLayout={null} // Let FlatList calculate automatically
          // Prevent layout jumps during typing
          inverted={false}
          // Keep content stable during updates
          extraData={streamingMessageId}
          // Reduce layout recalculations
          disableVirtualization={messages.length < 50}
        />

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
                  style={{
                    ...styles.textInput,
                    backgroundColor: theme.colors.gray['50'],
                    borderColor: inputText ? theme.colors.brand['300'] : theme.colors.border,
                  }}
                  inputStyle={styles.textInputStyle}
                  editable={!isStreaming}
                  autoFocus={false}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollToBottom(true);
                    }, 300);
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
      
      {/* Chat Settings Modal */}
      <ChatSettingsModal
        ref={chatSettingsModalRef}
        conversationId={currentConversationId || undefined}
        onDeleteConversation={handleDeleteConversation}
        onNavigateToCredits={handleNavigateToCredits}
      />
    </View>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const ChatScreenMemo = React.memo(ChatScreenComponent, (prevProps, nextProps) => {
  // Return true if props are equal (should NOT re-render)
  // Return false if props are different (should re-render)
  const areEqual = prevProps.navigation === nextProps.navigation && 
                   JSON.stringify(prevProps.route?.params) === JSON.stringify(nextProps.route?.params);
  
  return areEqual;
});

// Export the memoized version
export { ChatScreenMemo as ChatScreen };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTitleContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
    width: '100%',
  },
  headerTitleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  headerTitleText: {
    flexShrink: 1,
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 20, // Reduced padding for better spacing
    paddingHorizontal: 8,
  },
  emptyContent: {
    flexGrow: 1,
    paddingVertical: 20,
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
