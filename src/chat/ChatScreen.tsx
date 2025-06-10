/* eslint-disable no-undef */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Conditional imports for gradients
let LinearGradient: any, BlurView: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
  const blurLib = require('expo-blur');
  BlurView = blurLib.BlurView;
} catch {
  console.warn('Gradient/Blur libraries not available, using fallback components');
  LinearGradient = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
  BlurView = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
}
import { useTheme } from '../components/ThemeProvider';
import { Typography, IconButton, AILoadingAnimation } from '../ui/atoms';
// Removed unused icon imports
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './components/StreamingMessage';
import { ChatInputBar } from './components/ChatInputBar';
import { EmptyState } from './EmptyState';
import { Message } from './types';
import { ChatSettingsModal, ChatSettingsModalRef } from './ChatSettingsModal';
import { useEntitlements } from '../hooks/useEntitlements';
import { useStream, StreamMessage } from './useStream';
// Removed unused translation import
import { usePersona } from '../context/PersonaContext';
import { supabase } from '../lib/supabase';
import { isModelPremium } from '../utils/modelUtils';
import { ConversationService } from '../services/conversationService';

// Removed unused width constant

// Configuration for conversation history optimization
const CONVERSATION_OPTIMIZATION = {
  MAX_TOTAL_TOKENS: 8000,      // Conservative limit to stay within most model contexts
  CHARACTERS_PER_TOKEN: 4,     // Rough estimate: 1 token ≈ 4 characters
  MIN_MESSAGES_TO_KEEP: 4,     // Always keep at least the last 2 exchanges (4 messages)
  SYSTEM_PROMPT_BUFFER: 500,   // Reserve tokens for system prompt and current message
} as const;

/**
 * Extracts keywords from a message for relevance matching
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Limit to top 10 keywords
}

// Removed unused hasKeywordOverlap function

/**
 * Calculates relevance score for a message based on keyword overlap and other factors
 */
function calculateRelevanceScore(message: Message, keywords: string[]): number {
  let score = 0;
  
  // Keyword overlap score
  const messageKeywords = extractKeywords(message.text);
  const overlapCount = keywords.filter(keyword => 
    messageKeywords.some(msgKeyword => 
      msgKeyword.includes(keyword) || keyword.includes(msgKeyword)
    )
  ).length;
  score += overlapCount * 2;
  
  // Message importance factors
  if (message.text.length > 100) score += 1; // Longer messages often more important
  if (message.role === 'user') score += 1; // User questions are important context
  if (message.text.includes('tool')) score += 2; // Tool results provide valuable context
  if (message.text.match(/\b(plan|trip|travel|destination|flight|hotel)\b/i)) score += 1; // Travel-related terms
  
  return score;
}

/**
 * Optimizes conversation history using hybrid approach:
 * - Always keeps recent messages for immediate context
 * - Selects relevant older messages based on keyword similarity
 * - Respects token limits while maximizing context relevance
 */
function optimizeConversationHistory(messages: Message[], systemPrompt: string = '', currentMessage: string = ''): Message[] {
  if (messages.length === 0) return [];

  // Always keep minimum recent messages for short conversations
  if (messages.length <= CONVERSATION_OPTIMIZATION.MIN_MESSAGES_TO_KEEP) {
    return messages;
  }

  // 1. Always include last 4 messages (recent context)
  const recentMessages = messages.slice(-4);
  
  // 2. Find relevant older messages if we have a longer conversation
  const olderMessages = messages.slice(0, -4);
  let relevantOlderMessages: Message[] = [];
  
  if (olderMessages.length > 0 && currentMessage) {
    // Extract keywords from current message
    const keywords = extractKeywords(currentMessage);
    
    // Score and sort older messages by relevance
    const scoredMessages = olderMessages
      .map(msg => ({
        message: msg,
        score: calculateRelevanceScore(msg, keywords)
      }))
      .filter(item => item.score > 0) // Only include messages with some relevance
      .sort((a, b) => b.score - a.score); // Sort by relevance (highest first)
    
    // Take top 3 relevant older messages, respecting token limits
    const systemTokens = Math.ceil(systemPrompt.length / CONVERSATION_OPTIMIZATION.CHARACTERS_PER_TOKEN);
    const recentTokens = recentMessages.reduce((sum, msg) => 
      sum + Math.ceil(msg.text.length / CONVERSATION_OPTIMIZATION.CHARACTERS_PER_TOKEN), 0);
    
    let availableTokens = CONVERSATION_OPTIMIZATION.MAX_TOTAL_TOKENS - systemTokens - recentTokens - CONVERSATION_OPTIMIZATION.SYSTEM_PROMPT_BUFFER;
    
    for (const { message } of scoredMessages.slice(0, 3)) {
      const messageTokens = Math.ceil(message.text.length / CONVERSATION_OPTIMIZATION.CHARACTERS_PER_TOKEN);
      if (messageTokens <= availableTokens) {
        relevantOlderMessages.push(message);
        availableTokens -= messageTokens;
      }
    }
  }
  
  const selectedMessages = [...relevantOlderMessages, ...recentMessages];
  
  // Log optimization results
  const totalMessages = messages.length;
  const selectedCount = selectedMessages.length;
  const truncatedCount = totalMessages - selectedCount;
  
  if (truncatedCount > 0) {
    console.log(`📝 HYBRID OPTIMIZATION: Selected ${selectedCount}/${totalMessages} messages (${relevantOlderMessages.length} relevant older + ${recentMessages.length} recent)`);
  }
  
  return selectedMessages;
}

// Removed unused createConversationSummary function


interface ChatScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    setOptions: (options: object) => void;
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
  const { isSubscriber, hasCustomKey, remainingTokens, refreshCredits } = useEntitlements();
  const { currentPersona, setCurrentPersona } = usePersona();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);

  // Debug messages state changes
  React.useEffect(() => {
    console.log('📋 CHAT: Messages state updated. Count:', messages.length);
    messages.forEach((msg, i) => {
      console.log(`  ${i}: ${msg.role} (${msg.id}): ${msg.text?.substring(0, 50)}${msg.text && msg.text.length > 50 ? '...' : ''} [streaming: ${msg.isStreaming}]`);
    });
  }, [messages]);
  // Remove inputText state - now handled in ChatInputBar
  const [currentModel, setCurrentModel] = useState<string>('gpt-3.5'); // Will be loaded from storage

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>(''); // TODO: Display this in the UI
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [pendingSuggestion, setPendingSuggestion] = useState<string>('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  
  // Pagination state - Start with false for new conversations
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const chatSettingsModalRef = useRef<ChatSettingsModalRef>(null);
  const toolResultsRef = useRef<{ [messageId: string]: object }>({});
  const databaseMessageIdRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const lastSentMessageRef = useRef<{ text: string; timestamp: number } | null>(null);
  const isLoadingMoreRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);

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
      console.log('📄 Loading conversation:', conversationId);
      setIsLoadingConversation(true);

      // ✅ Reset pagination state when loading new conversation
      setCurrentOffset(0);
      setHasMoreMessages(true); // Set to true for existing conversations, will be updated by initial fetch
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;

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

      // Fetch initial messages using pagination (6 messages)
      const messagesResult = await ConversationService.fetchMessagesWithPagination(conversationId, 6, 0);
      
      if (messagesResult.error) {
        ConversationService.handleError(messagesResult.error, 'loading messages');
        return;
      }

      const messagesData = messagesResult.data || [];
      const hasMore = messagesResult.hasMore || false;
      
      if (messagesData.length === 0) {
        setMessages([]);
        setHasMoreMessages(false);
        setCurrentOffset(0);
      } else {
        // Convert database messages to UI format (keeping existing conversion logic)
        const uiMessages: Message[] = messagesData
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            text: msg.content,
            createdAt: msg.created_at,
            toolCalls: msg.tool_calls as Message['toolCalls'],
          }));

        // ✅ Deduplicate messages by ID to prevent duplicate rendering
        const deduplicatedMessages = uiMessages.filter((msg, index, arr) =>
          arr.findIndex(m => m.id === msg.id) === index
        );

        console.log(`📄 CHAT: Loaded ${uiMessages.length} messages, deduplicated to ${deduplicatedMessages.length}`);
        console.log(`📄 CHAT: hasMore from initial load: ${hasMore}, setting hasMoreMessages to: ${hasMore}`);
        console.log(`📄 CHAT: Setting currentOffset to: ${deduplicatedMessages.length}`);
        setMessages(deduplicatedMessages);
        setHasMoreMessages(hasMore); // ✅ Set hasMoreMessages from initial load
        setCurrentOffset(deduplicatedMessages.length); // ✅ Set offset to loaded message count
      }

      // Set the conversation state
      setCurrentConversationId(conversationId);
      conversationIdRef.current = conversationId; // Also store in ref for immediate access
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
    } finally {
      setIsLoadingConversation(false);
    }
  }, [setCurrentPersona, scrollToBottom]); // Only depend on setCurrentPersona to avoid unnecessary re-creation

  // Load more messages when scrolling to top
  const loadMoreMessages = useCallback(async () => {
    console.log('📄 CHAT: loadMoreMessages called');
    console.log('📄 CHAT: currentConversationId:', currentConversationId);
    console.log('📄 CHAT: isLoadingMore:', isLoadingMore);
    console.log('📄 CHAT: hasMoreMessages:', hasMoreMessages);
    console.log('📄 CHAT: currentOffset:', currentOffset);

    if (!currentConversationId || isLoadingMore || !hasMoreMessages || isLoadingMoreRef.current || isLoadingConversation) {
      console.log('📄 CHAT: Skipping loadMoreMessages - conditions not met');
      console.log('📄 CHAT: isLoadingMoreRef.current:', isLoadingMoreRef.current);
      console.log('📄 CHAT: isLoadingConversation:', isLoadingConversation);
      return;
    }

    console.log('📄 CHAT: Starting loadMoreMessages...');
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    
    try {
      const messagesResult = await ConversationService.fetchMessagesWithPagination(
        currentConversationId, 
        12, // Load 12 more messages
        currentOffset
      );
      
      if (messagesResult.error) {
        ConversationService.handleError(messagesResult.error, 'loading more messages');
        return;
      }

      const messagesData = messagesResult.data || [];
      const hasMore = messagesResult.hasMore || false;
      
      if (messagesData.length > 0) {
        // Convert database messages to UI format
        const uiMessages: Message[] = messagesData.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          text: msg.content,
          createdAt: msg.created_at,
          toolCalls: msg.tool_calls as Message['toolCalls'],
        }));

        // Prepend older messages to the beginning of the array
        setMessages(prev => [...uiMessages, ...prev]);
        setCurrentOffset(prev => prev + messagesData.length);
        setHasMoreMessages(hasMore);

        console.log(`📄 Loaded ${messagesData.length} more messages. Total: ${currentOffset + messagesData.length}`);
        console.log(`📄 hasMore from API: ${hasMore}, setting hasMoreMessages to: ${hasMore}`);
        
        // Don't auto-scroll when loading more messages - let user stay where they are
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('❌ Error loading more messages:', error);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [currentConversationId, isLoadingMore, hasMoreMessages, currentOffset, isLoadingConversation]);

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

  // Removed unused loadPersona function - persona loading is handled by navigation params

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
    onStart: async (conversationId) => {
      console.log('🎯 useStream: Stream started');
      console.log('🎯 useStream: streamingMessageIdRef.current =', streamingMessageIdRef.current);
      console.log('🎯 useStream: conversationId from startStream =', conversationId);
      console.log('🎯 useStream: currentConversationId state =', currentConversationId);

      // Save the assistant message placeholder to database when stream starts
      // Use the ref instead of state for immediate access
      const messageId = streamingMessageIdRef.current;

      // ✅ Use conversation ID passed directly from startStream
      if (conversationId) {
        try {
          console.log('💾 CHAT: Saving assistant message placeholder to database');
          console.log('💾 CHAT: Conversation ID:', conversationId);
          console.log('💾 CHAT: UI Message ID:', messageId);

          const result = await saveMessage(
            'assistant',
            '', // Empty content initially
            undefined, // No messageId - create new message
            undefined, // No tool calls yet
            conversationId // ✅ Pass the conversation ID to prevent creating new conversation
          );

          // Store the database message ID for later use
          databaseMessageIdRef.current = result.messageId;
          console.log('✅ CHAT: Successfully saved assistant message placeholder with ID:', result.messageId);
        } catch (error) {
          console.error('❌ CHAT: Failed to save assistant message placeholder:', error);
          // ✅ Set a flag to handle this in onComplete
          databaseMessageIdRef.current = 'FAILED_TO_CREATE';
        }
      } else {
        console.error('❌ CHAT: No conversation ID provided to onStart!');
        // ✅ Set a flag to handle this in onComplete
        databaseMessageIdRef.current = 'NO_CONVERSATION';
      }
    },
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
        streamingMessageIdRef.current = null;
      }
    },
    onToolResult: (toolResult) => {
      console.log('🔧 CHAT: Tool result received:', toolResult.name);
      console.log('🔧 CHAT: Tool content preview:', toolResult.content?.substring(0, 200));
      
      // Use the ref to get the current streaming message ID
      const targetMessageId = streamingMessageIdRef.current;
      console.log('🔧 CHAT: Target message ID from ref:', targetMessageId);
      
      if (!targetMessageId) {
        console.error('🔧 CHAT: No target message found for tool result!');
        return;
      }
      
      // Store tool results in a ref to track them
      toolResultsRef.current[targetMessageId] = toolResultsRef.current[targetMessageId] || {};
      toolResultsRef.current[targetMessageId][toolResult.name] = {
        called_at: new Date().toISOString(),
        success: true,
        data: null
      };
      
      if (toolResult.name === 'tripplanner') {
        try {
          const toolData = JSON.parse(toolResult.content);
          console.log('🔧 CHAT: Parsed tool data success:', toolData.success);
          console.log('🔧 CHAT: Tool data has data field:', !!toolData.data);
          
          if (toolData.success && toolData.data) {
            console.log('🔧 CHAT: Attaching toolResponse to message:', targetMessageId);
            
            // Update tool results ref with actual data
            toolResultsRef.current[targetMessageId][toolResult.name].data = toolData.data;
            
            setMessages(prev => {
              const updated = prev.map(m => 
                m.id === targetMessageId 
                  ? { 
                      ...m, 
                      toolResponse: {
                        type: 'tripplanner',
                        data: toolData.data
                      }
                    }
                  : m
              );
              console.log('🔧 CHAT: Updated message with toolResponse:', updated.find(m => m.id === targetMessageId)?.toolResponse);
              return updated;
            });
          } else {
            console.error('🔧 CHAT: Tool data missing success or data field');
          }
        } catch (error) {
          console.error('🔧 CHAT: Failed to parse tool result:', error);
          console.error('🔧 CHAT: Raw content:', toolResult.content);
        }
      }
    },
    onComplete: async (usage, finalContent) => {
      console.log('🏁 CHAT: onComplete called');

      const targetMessageId = streamingMessageIdRef.current;
      const dbMessageId = databaseMessageIdRef.current;

      console.log('🏁 CHAT: targetMessageId:', targetMessageId);
      console.log('🏁 CHAT: dbMessageId:', dbMessageId);
      console.log('🏁 CHAT: streamingText length:', streamingText?.length);
      console.log('🏁 CHAT: finalContent length:', finalContent?.length);
      console.log('🏁 CHAT: finalContent preview:', finalContent?.substring(0, 100));

      if (targetMessageId) {
        // Get the final message content and tool calls
        const toolCalls = toolResultsRef.current[targetMessageId];

        // ✅ Use finalContent from useStream ref, fallback to streamingText
        const content = finalContent || streamingText || '';

        console.log('🏁 CHAT: Using content length:', content.length);
        console.log('🏁 CHAT: Content preview:', content.substring(0, 100));
        console.log('🏁 CHAT: Tool calls:', JSON.stringify(toolCalls, null, 2));

        // Mark the message as no longer streaming
        setMessages(prev => prev.map(m =>
          m.id === targetMessageId
            ? { ...m, isStreaming: false, text: content }
            : m
        ));

        // Update the assistant message in database with final content using our tracked ID

        // ✅ Handle fallback cases where onStart failed to create database message
        if (dbMessageId === 'FAILED_TO_CREATE' || dbMessageId === 'NO_CONVERSATION') {
          console.log('🔄 CHAT: onStart failed to create assistant message, creating now...');
          try {
            const result = await saveMessage('assistant', content, undefined, undefined, conversationIdRef.current || currentConversationId);
            console.log('✅ CHAT: Successfully saved assistant message as fallback with ID:', result.messageId);
          } catch (error) {
            console.error('❌ CHAT: Failed to save assistant message as fallback:', error);
          }
        } else if (dbMessageId && conversationIdRef.current) {
          try {
            console.log('💾 CHAT: Updating assistant message in database');
            console.log('💾 CHAT: Database message ID:', dbMessageId);
            console.log('💾 CHAT: Conversation ID from ref:', conversationIdRef.current);
            console.log('💾 CHAT: Content length:', content.length);
            console.log('💾 CHAT: Tool calls object:', toolCalls);

            // Only use fallback text if we have tool calls but no content
            // For normal text responses, empty content might indicate an error
            const shouldUseFallback = !content.trim() && toolCalls && Object.keys(toolCalls).length > 0;
            
            const updateData: any = {
              content: content.trim() || (shouldUseFallback ? 'Tool executed successfully' : '[Empty response]')
            };
            
            // Only add tool_calls if we have them
            if (toolCalls && Object.keys(toolCalls).length > 0) {
              updateData.tool_calls = toolCalls;
            }

            const { data, error } = await supabase
              .from('messages')
              .update(updateData)
              .eq('id', dbMessageId)
              .select();

            if (error) {
              console.error('❌ CHAT: Failed to update assistant message:', error);
            } else {
              console.log('✅ CHAT: Successfully updated assistant message');
              console.log('✅ CHAT: Updated data:', data);
            }
          } catch (error) {
            console.error('❌ CHAT: Failed to update assistant message:', error);
          }
        } else {
          console.error('❌ CHAT: Missing dbMessageId or conversationId for update');
          console.error('❌ CHAT: dbMessageId:', dbMessageId);
          console.error('❌ CHAT: conversationIdRef.current:', conversationIdRef.current);
          console.error('❌ CHAT: currentConversationId state:', currentConversationId);
        }

        // Clean up tool results ref
        delete toolResultsRef.current[targetMessageId];
      }

      // Clean up refs
      databaseMessageIdRef.current = null;
      streamingMessageIdRef.current = null;

      if (streamingMessageId) {
        setStreamingMessageId(null);
      }

      // Assistant message is now saved by the client
      refreshCredits();

      // Scroll to bottom when streaming completes
      setTimeout(() => scrollToBottom(true), 100);
    }
  });

  // Remove the effect that was updating messages during streaming
  // The StreamingMessage component now handles this internally

  // Removed animation logic - now handled in ChatInputBar component

  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string, messageId?: string, toolCalls?: object, forceConversationId?: string): Promise<{ conversationId: string; messageId: string }> => {
    
    try {
      // ✅ Use forceConversationId if provided, otherwise fall back to state
      let conversationId = forceConversationId || currentConversationId;

      console.log('💾 CHAT: saveMessage called for', role);
      console.log('💾 CHAT: forceConversationId:', forceConversationId);
      console.log('💾 CHAT: currentConversationId state:', currentConversationId);
      console.log('💾 CHAT: Using conversationId:', conversationId);

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
        console.log('✅ CHAT: Created new conversation with ID:', conversationId);
        console.log('✅ CHAT: Setting currentConversationId state to:', conversationId);
        setCurrentConversationId(conversationId);
        conversationIdRef.current = conversationId; // Also store in ref for immediate access
        setConversationTitle(title);
      } 

      // Save message
      const messageData: any = {
        conversation_id: conversationId,
        role,
        content,
        model_used: role === 'assistant' ? currentModel : null,
      };
      
      // Add tool_calls if provided
      if (toolCalls) {
        messageData.tool_calls = toolCalls;
      }

      let result: { data: any[] | null; error: any };
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
      
      // Return both the conversation ID and the message ID
      return {
        conversationId,
        messageId: result.data[0].id
      };
      
    } catch (error) {
      console.error(`❌ Error saving ${role} message:`, error);
      throw error; // Re-throw so calling code can handle it
    }
  }, [currentConversationId, currentPersona, currentModel, setCurrentConversationId, setConversationTitle]);

  const handleSend = useCallback(async (text: string) => {
    console.log('🚀 CHAT: handleSend called with text:', text);
    console.log('🚀 CHAT: Call stack:', new Error().stack?.split('\n').slice(1, 5).join('\n'));
    console.log('🚀 CHAT: Current streaming state:', isStreaming);
    console.log('🚀 CHAT: Current streamingMessageId:', streamingMessageId);
    console.log('🚀 CHAT: isLoadingConversation:', isLoadingConversation);

    // ✅ Prevent empty or whitespace-only messages
    if (!text || text.trim().length === 0) {
      console.log('⚠️ CHAT: Empty text, ignoring send request');
      return;
    }

    // Prevent sending while conversation is loading
    if (isLoadingConversation) {
      console.log('⚠️ CHAT: Conversation is loading, ignoring send request');
      return;
    }

    // Prevent duplicate sends while streaming
    if (isStreaming) {
      console.log('⚠️ CHAT: Already streaming, ignoring send request');
      return;
    }

    // ✅ Prevent duplicate messages using ref-based tracking (more reliable)
    const now = Date.now();
    const trimmedText = text.trim();

    if (lastSentMessageRef.current) {
      const { text: lastText, timestamp: lastTime } = lastSentMessageRef.current;
      if (lastText === trimmedText && (now - lastTime) < 3000) { // Within 3 seconds
        console.log('⚠️ CHAT: Duplicate message detected via ref, ignoring send request');
        console.log('⚠️ CHAT: Last sent:', lastTime, 'Current:', now, 'Diff:', now - lastTime);
        return;
      }
    }

    // Update the ref with current message
    lastSentMessageRef.current = { text: trimmedText, timestamp: now };

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
      text: text,
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
      console.log('🧹 CHAT: Cleaning up previous streaming message:', streamingMessageId);
      setMessages(prev => {
        const filtered = prev.filter(m => {
          // Remove incomplete streaming messages (empty text and still streaming)
          if (m.id === streamingMessageId && m.isStreaming && (!m.text || m.text.trim() === '')) {
            console.log('🗑️ CHAT: Removing incomplete streaming message:', m.id);
            return false;
          }
          // Keep completed messages but mark as non-streaming
          if (m.id === streamingMessageId) {
            return true;
          }
          return true;
        }).map(m => 
          m.id === streamingMessageId 
            ? { ...m, isStreaming: false }
            : m
        );
        
        console.log('🧹 CHAT: Messages after cleanup:', filtered.length);
        return filtered;
      });
      setStreamingMessageId(null);
    }

    setMessages(prev => {
      // ✅ Deduplicate existing messages before adding new ones
      const deduplicatedPrev = prev.filter((msg, index, arr) =>
        arr.findIndex(m => m.id === msg.id) === index
      );

      console.log(`📄 CHAT: Deduplicating messages: ${prev.length} -> ${deduplicatedPrev.length}`);

      const newMessages = [...deduplicatedPrev, userMessage, assistantMessage];

      // Clean up message state if it gets too bloated (more than 30 messages)
      if (newMessages.length > 30) {
        console.log('🧹 CHAT: Message state cleanup - removing old messages');
        const cleaned = newMessages.filter(m => {
          // Always keep recent messages (last 20)
          if (newMessages.indexOf(m) >= newMessages.length - 20) {
            return true;
          }
          
          // For older messages, only keep high-quality ones
          if (m.role === 'assistant') {
            return m.text && m.text.trim() !== '' && 
                   m.text !== '[Empty response]' && 
                   m.text !== 'Tool executed successfully' &&
                   m.text.length > 20; // Keep substantial responses
          }
          
          if (m.role === 'user') {
            return m.text && m.text.trim().length > 3; // Keep meaningful user messages
          }
          
          return true;
        });
        
        console.log(`🧹 CHAT: State cleanup: ${newMessages.length} -> ${cleaned.length} messages`);
        return cleaned;
      }
      
      return newMessages;
    });
    
    setStreamingMessageId(assistantMessageId);
    streamingMessageIdRef.current = assistantMessageId; // Also update the ref

    // Save user message to database and ensure conversation exists
    let finalConversationId = currentConversationId;
    try {
      console.log('💾 CHAT: Saving user message and ensuring conversation exists');
      const result = await saveMessage('user', text);
      console.log('💾 CHAT: User message saved, conversation ID:', result.conversationId);

      // ✅ Store the conversation ID for passing to startStream
      finalConversationId = result.conversationId;

      // ✅ Ensure currentConversationId is set before starting stream
      if (!currentConversationId && result.conversationId) {
        console.log('💾 CHAT: Setting conversation ID from user message save:', result.conversationId);
        // Note: setCurrentConversationId is already called in saveMessage, but let's be explicit
      }
    } catch (error) {
      console.error('❌ Failed to save user message:', error);
      // Don't return here - still try to send the message to the AI
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
    
    // Filter out low-quality messages before optimization
    const qualityFilteredMessages = messages.filter(m => {
      // Remove empty or failed assistant responses
      if (m.role === 'assistant') {
        if (!m.text || m.text.trim() === '' || 
            m.text === '[Empty response]' || 
            m.text === 'Tool executed successfully') {
          console.log('🚫 CHAT: Filtering out failed assistant message:', m.id, `"${m.text}"`);
          return false;
        }
      }
      
      // Remove user messages that are just repeated "hello" or very short
      if (m.role === 'user') {
        const text = m.text?.toLowerCase().trim();
        // Count how many times this exact message appears
        const duplicateCount = messages.filter(msg => 
          msg.role === 'user' && msg.text?.toLowerCase().trim() === text
        ).length;
        
        // If it's a simple greeting repeated more than 2 times, filter out the extras
        if ((text === 'hello' || text === 'hi' || text === 'hey') && duplicateCount > 2) {
          // Keep only the first 2 instances
          const sameMessages = messages.filter(msg => 
            msg.role === 'user' && msg.text?.toLowerCase().trim() === text
          );
          const isFirstTwo = sameMessages.indexOf(m) < 2;
          if (!isFirstTwo) {
            console.log('🚫 CHAT: Filtering out duplicate greeting:', m.id, `"${m.text}"`);
            return false;
          }
        }
      }
      
      return true;
    });
    
    console.log(`🧹 CHAT: Quality filter: ${messages.length} -> ${qualityFilteredMessages.length} messages`);
    
    // Add conversation history with intelligent truncation
    const optimizedHistory = optimizeConversationHistory(qualityFilteredMessages, currentPersona?.system_prompt || '', text);
    streamMessages.push(...optimizedHistory.map(m => ({ role: m.role, content: m.text })));
    
    // Add current user message
    streamMessages.push({ role: 'user', content: text });

    // Log the conversation being sent to AI
    console.log('💬 CHAT: Conversation being sent to AI:');
    streamMessages.forEach((msg, i) => {
      console.log(`  ${i}: ${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });

    try {
      console.log('🚀 CHAT: Starting stream with conversation ID:', finalConversationId);
      await startStream({
        model: currentModel,
        messages: streamMessages,
        customApiKey: hasCustomKey ? undefined : undefined, // TODO: Get from user settings
        personaId: currentPersona?.id,
        conversationId: finalConversationId, // ✅ Pass conversation ID directly
      });
    } catch (error) {
      console.error('❌ Failed to start stream:', error);
    }
  }, [currentModel, remainingTokens, isSubscriber, hasCustomKey, streamingMessageId, currentPersona, messages, navigation, saveMessage, scrollToBottom, startStream, isStreaming, isLoadingConversation]);

  const renderMessage: ListRenderItem<Message> = useCallback(({ item }: { item: Message }) => {
    // Use StreamingMessage for the actively streaming message
    if (item.id === streamingMessageId && isStreaming) {
      return (
        <StreamingMessage
          message={item}
          streamingText={streamingText}
          isStreaming={isStreaming}
        />
      );
    }
    return <MessageBubble message={item} />;
  }, [streamingMessageId, isStreaming, streamingText]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    // Store the suggestion to pass to ChatInputBar
    setPendingSuggestion(suggestion);
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
          keyExtractor={(item, index) => `${item.id}-${index}`} // ✅ Ensure unique keys even if IDs duplicate
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent,
          ]}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            isLoadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <AILoadingAnimation size={24} />
                <Typography variant="bodySm" color={theme.colors.textSecondary} style={styles.loadingMoreText}>
                  Loading older messages...
                </Typography>
              </View>
            ) : null
          }
          maintainVisibleContentPosition={{
            minIndexForVisible: 1,
            autoscrollToTopThreshold: null, // Disable auto-scroll to top
          }}
          onContentSizeChange={() => {
            // Only auto-scroll if user is near the bottom (not browsing history)
            // @ts-ignore - scrollY is an Animated.Value
            if (scrollY.__getValue && scrollY.__getValue() < 100) {
              setTimeout(() => {
                scrollToBottom(true);
              }, 100);
            }
          }}
          onLayout={() => {
            // Only auto-scroll on initial layout, not when loading more messages
            if (messages.length <= 6) {
              setTimeout(() => {
                scrollToBottom(false);
              }, 50);
            }
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { 
              useNativeDriver: true,
              listener: (event: any) => {
                const { contentOffset } = event.nativeEvent;
                // Load more when scrolled near the top (within 100px)
                // Add additional checks to prevent infinite loops
                if (contentOffset.y < 100 && hasMoreMessages && !isLoadingMore && !isLoadingMoreRef.current && !isLoadingConversation && messages.length > 0) {
                  console.log('📄 SCROLL: Triggering loadMoreMessages from scroll listener');
                  console.log('📄 SCROLL: contentOffset.y:', contentOffset.y);
                  console.log('📄 SCROLL: hasMoreMessages:', hasMoreMessages);
                  console.log('📄 SCROLL: isLoadingMore:', isLoadingMore);
                  console.log('📄 SCROLL: isLoadingConversation:', isLoadingConversation);
                  console.log('📄 SCROLL: messages.length:', messages.length);
                  loadMoreMessages();
                }
              }
            }
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
        <ChatInputBar
          onSend={handleSend}
          isStreaming={isStreaming}
          onAbortStream={abortStream}
          onRetryStream={retryStream}
          streamError={streamError}
          keyboardHeight={keyboardHeight}
          bottomInset={insets.bottom}
          onScrollToBottom={scrollToBottom}
          initialText={pendingSuggestion}
          onTextConsumed={() => setPendingSuggestion('')}
          disabled={isLoadingConversation}
        />
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
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
  },
});
