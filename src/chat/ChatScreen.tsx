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
  TouchableOpacity,
  Vibration,
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
import { isModelPremium } from '../config/models';
import { ConversationService } from '../services/conversationService';
import { usePerformanceMonitor } from '../utils/performanceMonitor';
import { useMemoryLeakDetection } from '../utils/memoryLeakDetector';

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

  // Performance monitoring
  const { recordRender, timeAction, recordMemoryUsage } = usePerformanceMonitor('ChatScreen');
  const [messages, setMessages] = useState<Message[]>([]);

  // Debug messages state changes and record performance
  React.useEffect(() => {
    recordRender();
    recordMemoryUsage();

    if (__DEV__) {
      console.log('📋 CHAT: Messages state updated. Count:', messages.length);
      messages.forEach((msg, i) => {
        console.log(`  ${i}: ${msg.role} (${msg.id}): ${msg.text?.substring(0, 50)}${msg.text && msg.text.length > 50 ? '...' : ''} [streaming: ${msg.isStreaming}]`);
      });
    }
  }, [messages, recordRender, recordMemoryUsage]);
  // Remove inputText state - now handled in ChatInputBar
  const [currentModel, setCurrentModel] = useState<string>('gpt-3.5'); // Will be loaded from storage

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>(''); // TODO: Display this in the UI
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [pendingSuggestion, setPendingSuggestion] = useState<string>('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const jumpButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Pagination state - Start with false for new conversations
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const chatSettingsModalRef = useRef<ChatSettingsModalRef>(null);
  const toolResultsRef = useRef<{ [messageId: string]: object }>({});
  const [toolResultsVersion, setToolResultsVersion] = useState(0); // Force re-renders when tool results change
  const databaseMessageIdRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const lastSentMessageRef = useRef<{ text: string; timestamp: number } | null>(null);
  const isLoadingMoreRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);

  // Memory management constants
  const MAX_TOOL_RESULTS = 20; // Keep only last 20 tool results (reduced from 50)
  const MAX_MESSAGES_IN_MEMORY = 50; // Keep only last 50 messages (reduced from 100)

  // Memory management: Clean up old tool results
  const cleanupToolResults = useCallback(() => {
    const toolResultKeys = Object.keys(toolResultsRef.current);
    if (toolResultKeys.length > MAX_TOOL_RESULTS) {
      // Sort by message creation time (newest first)
      const sortedKeys = toolResultKeys.sort((a, b) => {
        const messageA = messages.find(m => m.id === a);
        const messageB = messages.find(m => m.id === b);
        if (!messageA || !messageB) return 0;
        return new Date(messageB.createdAt).getTime() - new Date(messageA.createdAt).getTime();
      });

      // Remove old tool results
      const keysToRemove = sortedKeys.slice(MAX_TOOL_RESULTS);
      keysToRemove.forEach(key => {
        delete toolResultsRef.current[key];
      });

      if (keysToRemove.length > 0) {
        console.log(`🧹 MEMORY: Cleaned up ${keysToRemove.length} old tool results`);
      }
    }
  }, [messages]);

  // Memory management: Trim old messages
  const trimOldMessages = useCallback((messageList: Message[]) => {
    if (messageList.length > MAX_MESSAGES_IN_MEMORY) {
      const trimmed = messageList.slice(-MAX_MESSAGES_IN_MEMORY);
      console.log(`🧹 MEMORY: Trimmed messages: ${messageList.length} -> ${trimmed.length}`);
      return trimmed;
    }
    return messageList;
  }, []);

  // Enhanced memory monitoring and cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Record memory usage before cleanup
      recordMemoryUsage();

      // Clean up old tool results
      cleanupToolResults();

      // Trim messages if too many in memory
      setMessages(prev => trimOldMessages(prev));

      // Force garbage collection and measure impact
      const gcResult = forceGC();

      // Record memory usage after cleanup
      recordMemoryUsage();

      // Take memory snapshot and analyze for leaks
      const snapshot = takeSnapshot();
      if (snapshot && snapshot.heapUsed > 200) {
        console.warn(`⚠️ MEMORY LEAK ALERT: High usage after cleanup: ${snapshot.heapUsed.toFixed(1)}MB`);

        // Analyze leak patterns
        const leakPatterns = analyzeLeaks();
        if (leakPatterns.length > 0) {
          console.error('🚨 MEMORY LEAK PATTERNS DETECTED:');
          leakPatterns.forEach((pattern, i) => {
            console.error(`  ${i + 1}. [${pattern.severity.toUpperCase()}] ${pattern.type}: ${pattern.description}`);
            console.error(`     💡 ${pattern.recommendation}`);
          });

          // Log detailed state for critical leaks
          if (leakPatterns.some(p => p.severity === 'critical')) {
            logState();
          }
        }
      }

      console.log(`🧹 MEMORY: Cleanup completed. Messages: ${messages.length}, Tool results: ${Object.keys(toolResultsRef.current).length}`);
    }, 2 * 60 * 1000); // Every 2 minutes (more aggressive)

    return () => clearInterval(cleanupInterval);
  }, [cleanupToolResults, trimOldMessages, messages.length, recordMemoryUsage]);

  // Component mount/unmount tracking
  useEffect(() => {
    return () => {
      // Cleanup if needed
      console.log('🧹 CHAT: Component unmounting - cleaning up memory');
      
      // Clear all messages to free memory
      setMessages([]);
      
      // Clear all refs
      toolResultsRef.current = {};
      streamingMessageIdRef.current = null;
      databaseMessageIdRef.current = null;
      conversationIdRef.current = null;
      lastSentMessageRef.current = null;
      
      // Force garbage collection on unmount
      if (global.gc) {
        global.gc();
        console.log('🗑️ MEMORY: Forced garbage collection on component unmount');
      }
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
              <View style={styles.personaIconContainer}>
                <Typography variant="bodyMd">
                  {currentPersona.icon}
                </Typography>
              </View>
            )}
            <View style={styles.headerTextContainer}>
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
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <IconButton
            icon="settings"
            onPress={() => chatSettingsModalRef.current?.present()}
            variant="ghost"
            size="md"
            style={styles.headerSettingsButton}
          />
        </View>
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
    streamingText, // Keep for backward compatibility in logs
    displayedText, // New optimized display text
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
      
      // Parse tool result content for all tools
      try {
        const toolData = JSON.parse(toolResult.content);
        console.log('🔧 CHAT: Parsed tool data for', toolResult.name, '- success:', toolData.success);
        console.log('🔧 CHAT: Tool data has data field:', !!toolData.data);
        
        // Store the tool result with parsed data
        toolResultsRef.current[targetMessageId][toolResult.name] = {
          called_at: new Date().toISOString(),
          success: toolData.success || false,
          data: toolData.data || null
        };

        // Trigger re-render to update streaming message with tool results
        setToolResultsVersion(prev => prev + 1);
        
        // Special handling for specific tools that need UI updates
        if (toolResult.name === 'tripplanner' && toolData.success && toolData.data) {
          console.log('🔧 CHAT: Attaching tripplanner toolResponse to message:', targetMessageId);
          
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
        }
      } catch (error) {
        console.error('🔧 CHAT: Failed to parse tool result for', toolResult.name, ':', error);
        console.error('🔧 CHAT: Raw content:', toolResult.content);
        
        // Store as failed tool result
        toolResultsRef.current[targetMessageId][toolResult.name] = {
          called_at: new Date().toISOString(),
          success: false,
          data: null
        };

        // Trigger re-render to update streaming message with tool results
        setToolResultsVersion(prev => prev + 1);
      }
    },
    onComplete: async (usage, finalContent) => {
      console.log('🏁 CHAT: onComplete called');

      const targetMessageId = streamingMessageIdRef.current;
      const dbMessageId = databaseMessageIdRef.current;

      console.log('🏁 CHAT: targetMessageId:', targetMessageId);
      console.log('🏁 CHAT: dbMessageId:', dbMessageId);
      console.log('🏁 CHAT: streamingText length:', streamingText?.length);
      console.log('🏁 CHAT: displayedText length:', displayedText?.length);
      console.log('🏁 CHAT: finalContent length:', finalContent?.length);
      console.log('🏁 CHAT: finalContent preview:', finalContent?.substring(0, 100));

      if (targetMessageId) {
        // Get the final message content and tool calls
        const toolCalls = toolResultsRef.current[targetMessageId];

        // ✅ Use finalContent from useStream ref, fallback to displayedText
        const content = finalContent || displayedText || '';

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

            // Tools with custom UI components - don't use fallback text, let UI components render
            const toolsWithCustomUI = ['tripplanner', 'weather', 'wiki', 'convert', 'nutrition', 'summarise'];
            const hasCustomUITools = toolCalls && Object.keys(toolCalls).some(toolName =>
              toolsWithCustomUI.includes(toolName)
            );

            // Only use fallback text if we have tool calls but no content AND no custom UI tools
            // For tools with custom UI, empty content is fine - the UI components will render
            const shouldUseFallback = !content.trim() && toolCalls && Object.keys(toolCalls).length > 0 && !hasCustomUITools;

            const updateData: any = {
              content: content.trim() || (shouldUseFallback ? 'Tool executed successfully' : '')
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

              // CRITICAL FIX: Update tool results reference to use database ID instead of streaming ID
              if (targetMessageId && dbMessageId && targetMessageId !== dbMessageId) {
                const toolResults = toolResultsRef.current[targetMessageId];
                if (toolResults) {
                  console.log('🔄 CHAT: Moving tool results from streaming ID to database ID');
                  console.log('🔄 CHAT: From:', targetMessageId, 'To:', dbMessageId);
                  toolResultsRef.current[dbMessageId] = toolResults;
                  delete toolResultsRef.current[targetMessageId];
                  setToolResultsVersion(prev => prev + 1); // Trigger re-render
                }
              }
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

  // Memory leak detection - now that all variables are available
  const { takeSnapshot, analyzeLeaks, logState, forceGC } = useMemoryLeakDetection({
    messagesCount: messages.length,
    toolResultsCount: Object.keys(toolResultsRef.current).length,
    streamingTextLength: displayedText?.length || 0, // Use optimized displayedText
    isStreaming: isStreaming,
    conversationId: currentConversationId
  });

  // Take memory snapshots during key operations
  useEffect(() => {
    takeSnapshot();
  }, [messages.length, isStreaming, takeSnapshot]);

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

      // Apply memory management: trim messages and clean up tool results
      const trimmedMessages = trimOldMessages(newMessages);

      // Clean up tool results after message trimming
      setTimeout(() => {
        cleanupToolResults();
      }, 100);

      return trimmedMessages;
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
    
    // Tool names for context optimization
    const availableToolNames = ['weather', 'wiki', 'nutrition', 'convert', 'flights', 'summarise', 'moodmusic', 'code_search', 'md2slides', 'tripplanner'];
    
    // Detect if this is likely a tool-based query by checking for tool-related patterns
    const toolKeywords = [
      'weather', 'temperature', 'forecast', 'climate',
      'wikipedia', 'wiki', 'search', 'information about',
      'nutrition', 'calories', 'protein', 'carbs', 'fat',
      'convert', 'conversion', 'exchange rate', 'currency',
      'flight', 'flights', 'airplane', 'airline',
      'summarize', 'summarise', 'summary', 'extract',
      'music', 'song', 'playlist', 'mood',
      'trip', 'travel', 'itinerary', 'plan'
    ];
    
    const isLikelyToolQuery = toolKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    // For likely tool queries, use minimal context to prevent LLM from re-executing old tool calls
    if (isLikelyToolQuery) {
      console.log('🔧 CHAT: Likely tool query detected - using minimal context to prevent duplicate executions');
      
      // Only include system prompt and current message - no history
      // This prevents the LLM from seeing previous unanswered tool queries
      console.log('🔧 CHAT: Skipping conversation history for tool query to prevent duplicates');
    } else {
      // For conversational queries, use existing optimization logic
      console.log('🔧 CHAT: Conversational query - using full context optimization');
      
      const qualityFilteredMessages = messages.filter(m => {
        // Remove empty or failed assistant responses
        if (m.role === 'assistant') {
          // Check if this message has tool calls with custom UI
          const toolsWithCustomUI = ['tripplanner', 'weather', 'wiki', 'convert', 'nutrition', 'summarise'];
          const hasCustomUITools = m.toolCalls && Object.keys(m.toolCalls).some(toolName =>
            toolsWithCustomUI.includes(toolName)
          );

          // Don't filter out messages with custom UI tools, even if content is empty
          if (hasCustomUITools) {
            return true;
          }

          // Filter out empty or failed responses for non-tool messages
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

      // Filter out incomplete exchanges - only include user messages that have corresponding assistant responses
      const completeExchanges: StreamMessage[] = [];
      for (let i = 0; i < optimizedHistory.length; i++) {
        const message = optimizedHistory[i];

        if (message.role === 'user') {
          // Look for the next assistant message
          const nextMessage = optimizedHistory[i + 1];
          if (nextMessage && nextMessage.role === 'assistant') {
            // Complete exchange - include both user and assistant messages
            completeExchanges.push({ role: message.role, content: message.text });
            completeExchanges.push({ role: nextMessage.role, content: nextMessage.text });
            i++; // Skip the assistant message since we already processed it
          }
          // If no assistant response, drop the user message (incomplete exchange)
        } else if (message.role === 'assistant') {
          // Standalone assistant message (shouldn't happen in normal flow, but handle gracefully)
          // Only include if it has meaningful content
          if (message.text.trim()) {
            completeExchanges.push({ role: message.role, content: message.text });
          }
        }
      }

      streamMessages.push(...completeExchanges);

      console.log(`🧹 CHAT: Filtered conversation history: ${optimizedHistory.length} -> ${completeExchanges.length} messages (complete exchanges only)`);
    }
    
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

  const renderMessage: ListRenderItem<Message> = useCallback(({ item, index }: { item: Message; index: number }) => {
    // Determine if this message is part of a group (consecutive messages from same sender)
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    const isFirstInGroup = !prevMessage || prevMessage.role !== item.role;
    const isLastInGroup = !nextMessage || nextMessage.role !== item.role;
    
    // For streaming messages, always show avatar and timestamp
    const showAvatar = isFirstInGroup || item.isStreaming;
    const showTimestamp = isLastInGroup || item.isStreaming;

    // Use StreamingMessage for the actively streaming message
    if (item.id === streamingMessageId && isStreaming) {
      // Get tool results for the streaming message (could be under streaming ID or database ID)
      const toolCalls = toolResultsRef.current[item.id] as { [toolName: string]: { called_at: string; success: boolean; data?: any } } || {};

      return (
        <StreamingMessage
          message={item}
          streamingText={displayedText} // Use optimized displayedText
          isStreaming={isStreaming}
          toolCalls={toolCalls}
        />
      );
    }

    // For non-streaming messages, check if we have tool results stored under this message ID
    const hasStoredToolResults = toolResultsRef.current[item.id];
    if (hasStoredToolResults) {
      // Create a message with the stored tool results
      const messageWithToolResults = {
        ...item,
        toolCalls: {
          ...item.toolCalls,
          ...toolResultsRef.current[item.id]
        }
      };
      return (
        <MessageBubble 
          message={messageWithToolResults} 
          showAvatar={showAvatar}
          showTimestamp={showTimestamp}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
        />
      );
    }

    return (
      <MessageBubble 
        message={item} 
        showAvatar={showAvatar}
        showTimestamp={showTimestamp}
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
      />
    );
  }, [streamingMessageId, isStreaming, displayedText, toolResultsVersion, messages]); // Add messages dependency

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
      {/* Clean Light Background */}
      <View style={[styles.cleanBackground, { backgroundColor: theme.colors.background }]} />

      {/* Content with Enhanced KeyboardAvoidingView */}
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
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                
                // Load more when scrolled near the top (within 100px)
                if (contentOffset.y < 100 && hasMoreMessages && !isLoadingMore && !isLoadingMoreRef.current && !isLoadingConversation && messages.length > 0) {
                  console.log('📄 SCROLL: Triggering loadMoreMessages from scroll listener');
                  loadMoreMessages();
                }
                
                // Show/hide jump to bottom button based on scroll position
                const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
                const shouldShow = distanceFromBottom > 200; // Show when 200px from bottom
                
                if (shouldShow !== showJumpToBottom) {
                  setShowJumpToBottom(shouldShow);
                  // Animate jump button appearance
                  Animated.spring(jumpButtonAnim, {
                    toValue: shouldShow ? 1 : 0,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                  }).start();
                }
              }
            }
          )}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // Performance optimizations to prevent jumping
          removeClippedSubviews={true} // Enable clipping for better memory management
          windowSize={5} // Reduced window size for memory efficiency
          maxToRenderPerBatch={5} // Render fewer items per batch
          initialNumToRender={10} // Render fewer items initially
          updateCellsBatchingPeriod={100} // Longer batching period to reduce updates
          getItemLayout={null} // Let FlatList calculate automatically
          // Prevent layout jumps during typing
          inverted={false}
          // Keep content stable during updates
          extraData={streamingMessageId}
          // Enable virtualization for better memory management
          disableVirtualization={false} // Always enable virtualization
        />

        {/* Jump to Bottom Button */}
        <Animated.View
          style={[
            styles.jumpToBottomButton,
            { 
              backgroundColor: theme.colors.brand['500'],
              shadowColor: theme.colors.brand['600'],
              opacity: jumpButtonAnim,
              transform: [
                {
                  scale: jumpButtonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  translateY: jumpButtonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }
          ]}
          pointerEvents={showJumpToBottom ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.jumpToBottomButtonTouchable}
            onPress={() => {
              Vibration.vibrate(50); // Light haptic feedback
              scrollToBottom(true);
            }}
            activeOpacity={0.8}
          >
            <Typography variant="h4" color="#FFFFFF" style={{ fontSize: 20 }}>
              ↓
            </Typography>
          </TouchableOpacity>
        </Animated.View>

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
  cleanBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  headerTitleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    maxWidth: '100%',
  },
  headerTitleText: {
    flexShrink: 1,
    textAlign: 'left',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  headerSettingsButton: {
    marginLeft: 8,
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
  personaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(57, 112, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSubtitle: {
    marginTop: 2,
  },
  jumpToBottomButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  jumpToBottomButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
});
