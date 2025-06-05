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
import { Typography, TextField, Surface } from '../ui/atoms';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from './EmptyState';
import { Message, mockMessages } from './types';
import { SimpleModelPicker } from '../models/SimpleModelPicker';
import { CreditsDisplay } from '../credits/CreditsDisplay';
import { useEntitlements } from '../hooks/useEntitlements';
import { useStream, StreamMessage } from './useStream';
import { useTranslation } from 'react-i18next';
import { usePersona } from '../context/PersonaContext';
import { usePremium } from '../hooks/usePremium';
import { supabase } from '../lib/supabase';
import { isModelPremium } from '../utils/modelUtils';

const { width } = Dimensions.get('window');


interface ChatScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    setOptions: (options: any) => void;
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
  const [isModelPickerVisible, setIsModelPickerVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('gpt-3.5'); // Will be loaded from storage

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;

  // Component mount/unmount tracking
  useEffect(() => {
    console.log('ChatScreen MOUNTED');
    return () => {
      console.log('ChatScreen UNMOUNTED');
    };
  }, []);



  // Load model from conversation or use persona default
  useEffect(() => {
    const loadConversationModel = async () => {
      try {
        if (currentConversationId) {
          // Load model from existing conversation
          console.log(`🔄 Loading model from conversation: ${currentConversationId}`);
          const { data: conversation, error } = await supabase
            .from('conversations')
            .select('current_model')
            .eq('id', currentConversationId)
            .single();

          if (!error && conversation?.current_model) {
            console.log(`📱 Found conversation model: ${conversation.current_model}`);
            if (conversation.current_model !== currentModel) {
              setCurrentModel(conversation.current_model);
            }
            return;
          }
        }

        // For new conversations, use persona's default model
        if (currentPersona && currentPersona.default_model !== currentModel) {
          console.log(`🔄 Using persona default model: ${currentPersona.default_model}`);
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
        console.log('Scroll error:', error);
        // Fallback: scroll to index
        try {
          flatListRef.current.scrollToIndex({ 
            index: messages.length - 1, 
            animated,
            viewPosition: 1 
          });
        } catch (indexError) {
          console.log('Index scroll error:', indexError);
        }
      }
    }
  }, [messages.length]);

  // Update navigation title when persona or model changes
  React.useLayoutEffect(() => {
    console.log('🎯 useLayoutEffect triggered - setting navigation options', {
      personaName: currentPersona?.display_name,
      currentModel
    });
    
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity 
          onPress={() => setIsModelPickerVisible(true)}
          style={styles.headerTitleContainer}
          activeOpacity={0.7}
        >
          <View style={styles.headerTitleContent}>
            {currentPersona && (
              <Typography variant="bodyLg" style={{ marginRight: 6 }}>
                {currentPersona.icon}
              </Typography>
            )}
            <Typography
              variant="bodyLg"
              weight="semibold"
              color={theme.colors.textPrimary}
            >
              {currentPersona?.display_name || 'Chat'}
            </Typography>
            <Typography
              variant="bodySm"
              color={theme.colors.brand['500']}
              style={{ marginLeft: 6 }}
            >
              ⚙️
            </Typography>
          </View>
        </TouchableOpacity>
      )
    });
  }, [currentPersona?.display_name, currentModel, navigation, theme.colors.textPrimary, theme.colors.brand]);

  const loadConversation = useCallback(async (conversationId: string) => {
    console.log('🔄 loadConversation called with ID:', conversationId);
    
    try {
      // First, fetch the conversation details
      console.log('📞 Fetching conversation details...');
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          personas (*)
        `)
        .eq('id', conversationId)
        .single();

      if (convError) {
        console.error('❌ Error fetching conversation:', convError);
        return;
      }

      console.log('✅ Conversation fetched:', {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        message_count: conversation.message_count,
        current_model: conversation.current_model,
        persona_id: conversation.persona_id,
        has_persona: !!conversation.personas
      });

      // Now fetch the messages
      console.log('📞 Fetching messages for conversation...');
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError);
        return;
      }

      console.log('📨 Messages fetched:', {
        count: messagesData?.length || 0,
        messages: messagesData?.map(m => ({
          id: m.id,
          role: m.role,
          content_length: m.content?.length || 0,
          created_at: m.created_at
        }))
      });

      if (!messagesData || messagesData.length === 0) {
        console.log('⚠️ No messages found for conversation:', conversationId);
        setMessages([]);
      } else {
        // Convert messages to UI format
        const uiMessages: Message[] = messagesData
          .filter(msg => {
            const keep = msg.role !== 'system';
            if (!keep) {
              console.log('🔇 Filtering out system message:', msg.id);
            }
            return keep;
          })
          .map(msg => {
            const uiMessage = {
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              text: msg.content,
              createdAt: msg.created_at,
            };
            console.log('🔄 Converting message:', {
              id: msg.id,
              role: msg.role,
              text_length: msg.content?.length || 0,
              created_at: msg.created_at
            });
            return uiMessage;
          });

        console.log('✅ Setting UI messages:', {
          count: uiMessages.length,
          messages: uiMessages.map(m => ({
            id: m.id,
            role: m.role,
            text_preview: m.text?.substring(0, 50) + '...',
            createdAt: m.createdAt
          }))
        });

        setMessages(uiMessages);
      }

      // Set the conversation state
      setCurrentConversationId(conversationId);
      setConversationTitle(conversation.title || '');

      // Set model from conversation if available
      if (conversation.current_model) {
        console.log('🔧 Setting model from conversation:', conversation.current_model);
        setCurrentModel(conversation.current_model);
      }

      // Always set persona from conversation data to ensure consistency
      if (conversation.personas) {
        console.log('👤 Setting persona from conversation:', conversation.personas.display_name);
        setCurrentPersona(conversation.personas);
        if (!conversation.current_model) {
          setCurrentModel(conversation.personas.default_model);
        }
      }
      
      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        console.log('📜 Scrolling to bottom after loading messages');
        scrollToBottom(false);
      }, 100);

    } catch (error) {
      console.error('❌ Unexpected error in loadConversation:', error);
    }
  }, [setCurrentPersona, scrollToBottom]); // Only depend on setCurrentPersona to avoid unnecessary re-creation

  // Load conversation on mount (only for existing conversations)
  useEffect(() => {
    const conversationId = route?.params?.conversationId;
    
    console.log('🎯 ChatScreen useEffect triggered:', {
      conversationId,
      currentConversationId,
      routeParamsStr: JSON.stringify(route?.params),
      timestamp: Date.now()
    });
    
    if (conversationId) {
      if (conversationId !== currentConversationId) {
        console.log('🚀 Loading conversation (ID mismatch):', {
          new: conversationId,
          current: currentConversationId
        });
        loadConversation(conversationId);
      } else {
        console.log('⏭️ Skipping load - conversation already loaded:', conversationId);
      }
    } else {
      console.log('🆕 No conversationId in route - this is a new conversation');
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
      console.log('🏁 Stream onComplete called', {
        streamingMessageId,
        streamingTextLength: streamingText?.length,
        streamingTextPreview: streamingText?.substring(0, 100) + '...',
        usage
      });
      
      if (streamingMessageId) {
        // Just mark the message as no longer streaming - text is already updated by useEffect
        setMessages(prev => prev.map(m => 
          m.id === streamingMessageId 
            ? { ...m, isStreaming: false }
            : m
        ));
        setStreamingMessageId(null);

        // ⚠️ IMPORTANT: Check if assistant message saving is disabled/commented out
        console.log('🤔 ASSISTANT MESSAGE SAVING: Is this being called?');
        console.log('🤔 STREAMING TEXT TO SAVE:', streamingText?.substring(0, 200) + '...');
        
        // Server now saves the assistant message automatically
        console.log('✅ Assistant message should be saved by server automatically');
        console.log('✅ No manual saving needed for assistant messages');
      } else {
        console.log('⚠️ onComplete called but missing streamingMessageId');
      }
      refreshCredits();
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

  const saveMessage = async (role: 'user' | 'assistant', content: string, messageId?: string): Promise<string> => {
    console.log(`💾 SAVE MESSAGE START - ${role} message (${content.length} chars)${messageId ? ` with ID ${messageId}` : ''}`);
    console.log(`💾 SAVE MESSAGE DETAILS:`, {
      role,
      contentPreview: content.substring(0, 100) + '...',
      messageId,
      currentConversationId,
      currentModel
    });
    
    try {
      let conversationId = currentConversationId;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        console.log('🆕 No current conversation - creating new one');
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
        
        console.log('🔐 Getting current user...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ Error getting user:', userError);
          throw userError;
        }
        
        if (!user) {
          console.error('❌ No authenticated user found');
          throw new Error('No authenticated user');
        }
        
        console.log('✅ User authenticated:', user.id);
        
        const conversationData = {
          user_id: user.id,
          persona_id: currentPersona?.id || null,
          title,
          last_message_preview: role === 'user' ? content : null,
          message_count: 0,
          current_model: currentModel, // Save the current model
        };
        
        console.log(`📝 Creating new conversation with data:`, conversationData);
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
        console.log(`✅ Created conversation: ${conversationId}`);
      } else {
        console.log('📝 Using existing conversation:', conversationId);
      }

      // Save message
      const messageData = {
        conversation_id: conversationId,
        role,
        content,
        model_used: role === 'assistant' ? currentModel : null,
      };

      console.log(`💾 MESSAGE DATA TO SAVE:`, messageData);

      let result;
      if (messageId) {
        // Update existing message (for streaming completion)
        console.log(`🔄 Updating existing message ${messageId} in conversation ${conversationId}`);
        result = await supabase
          .from('messages')
          .update(messageData)
          .eq('id', messageId)
          .select();
      } else {
        // Insert new message
        console.log(`➕ Inserting new ${role} message in conversation ${conversationId}`);
        result = await supabase
          .from('messages')
          .insert(messageData)
          .select();
      }

      console.log(`💾 SUPABASE RESULT:`, {
        error: result.error,
        dataCount: result.data?.length,
        data: result.data
      });

      if (result.error) {
        console.error(`❌ Database error saving ${role} message:`, result.error);
        console.error(`❌ Error details:`, {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint
        });
        throw result.error;
      }

      if (!result.data || result.data.length === 0) {
        console.error('❌ No data returned from message save');
        throw new Error('No message data returned');
      }

      console.log(`✅ Successfully saved ${role} message to database - result:`, result.data);
      
      // Return the conversation ID for use in streaming
      return conversationId;
      
    } catch (error) {
      console.error(`❌ Error saving ${role} message:`, error);
      console.error(`❌ Full error object:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error; // Re-throw so calling code can handle it
    }
  };

  const handleSend = useCallback(async () => {
    console.log('🚀 HANDLE SEND CALLED');
    
    if (inputText.trim().length === 0 || isStreaming) {
      console.log('❌ SEND BLOCKED:', {
        inputEmpty: inputText.trim().length === 0,
        isStreaming
      });
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
      console.log('❌ PAYWALL: No access to premium model');
      navigation.navigate('Paywall');
      return;
    }

    console.log('✅ ACCESS GRANTED: Proceeding with message send');

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

    console.log('📝 ADDING MESSAGES TO UI:', {
      userMessageId: userMessage.id,
      assistantMessageId,
      messageText: userMessage.text.substring(0, 50) + '...'
    });

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setStreamingMessageId(assistantMessageId);
    
    const messageText = inputText.trim();
    setInputText('');

    // Save user message to database and get the conversation ID
    console.log('💾 CALLING saveMessage for user message:', messageText.substring(0, 50) + '...');
    let actualConversationId: string;
    try {
      actualConversationId = await saveMessage('user', messageText);
      console.log('✅ User message saved successfully, conversation ID:', actualConversationId);
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

    console.log('🎯 STARTING STREAM with messages:', {
      count: streamMessages.length,
      hasSystemPrompt: streamMessages.some(m => m.role === 'system'),
      model: currentModel,
      conversationId: actualConversationId
    });

    try {
      await startStream({
        model: currentModel,
        messages: streamMessages,
        customApiKey: hasCustomKey ? undefined : undefined, // TODO: Get from user settings
        conversationId: actualConversationId,
      });
      console.log('✅ Stream started successfully');
    } catch (error) {
      console.error('❌ Failed to start stream:', error);
    }
  }, [inputText, currentModel, isSubscriber, hasCustomKey, remainingTokens, navigation, messages, isStreaming, startStream, streamingMessageId, currentConversationId, currentPersona, saveMessage]);

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <MessageBubble message={item} />
  );

  const handleSuggestionPress = useCallback((suggestion: string) => {
    console.log('💡 SUGGESTION PRESSED:', suggestion);
    setInputText(suggestion);
  }, []);

  const renderEmptyState = useMemo(() => <EmptyState onSuggestionPress={handleSuggestionPress} />, [handleSuggestionPress]);
  
  const handleModelSelect = async (modelId: string) => {
    console.log(`Selected model: ${modelId} for conversation: ${currentConversationId || 'new'}`);
    setCurrentModel(modelId);
    
    // Save the model to the conversation if it exists using secure RPC
    if (currentConversationId) {
      try {
        const { data, error } = await supabase.rpc('update_conversation_model', {
          conversation_uuid: currentConversationId,
          new_model: modelId
        });

        if (error) {
          console.error('Failed to update conversation model:', error);
        } else if (data) {
          console.log(`📱 Successfully updated conversation model: ${modelId}`);
        } else {
          console.warn('Model update returned false - conversation not found or no permission');
        }
      } catch (error) {
        console.error('Failed to persist model selection:', error);
        // Don't show error to user - model still works for current session
      }
    }
    // For new conversations, the model will be saved when the conversation is created
  };
  
  const handleNavigateToPaywall = () => {
    navigation.navigate('Paywall');
  };

  // Debug model selection state
  React.useEffect(() => {
    console.log(`ModelPicker visibility: ${isModelPickerVisible}`);
    console.log(`Current model: ${currentModel}`);
  }, [isModelPickerVisible, currentModel]);


  // Prevent rendering until persona is loaded for new conversations
  const isNewConversation = !route?.params?.conversationId;
  const shouldShowLoading = isNewConversation && !currentPersona;
  
  if (shouldShowLoading) {
    console.log('⏳ ChatScreen: Waiting for persona to load...');
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Typography variant="bodyLg" color={theme.colors.textSecondary}>
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
          removeClippedSubviews={false}
          windowSize={10}
          maxToRenderPerBatch={10}
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
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.gray['50'],
                      borderColor: inputText ? theme.colors.brand['300'] : theme.colors.border,
                    } as any,
                  ]}
                  inputStyle={styles.textInputStyle}
                  editable={!isStreaming}
                  autoFocus={false}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollToBottom(true);
                    }, 300);
                  }}
                  blurOnSubmit={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
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
  },
  headerTitleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 120, // Extra space for input bar
    paddingHorizontal: 8,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 400,
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
