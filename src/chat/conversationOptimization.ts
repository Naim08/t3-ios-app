/**
 * Conversation History Optimization Configuration
 * 
 * This module handles intelligent truncation of conversation history to:
 * 1. Reduce token consumption and costs
 * 2. Stay within model context windows
 * 3. Preserve recent and important context
 * 4. Improve response latency
 */

import { Message } from './types';

// Model-specific context window sizes (in tokens)
export const MODEL_CONTEXT_LIMITS = {
  'gpt-3.5': 4096,
  'gpt-3.5-turbo': 4096,
  'gpt-4': 8192,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'claude-3-sonnet': 200000,
  'claude-3-opus': 200000,
  'claude-3-haiku': 200000,
  'claude-3-5-sonnet': 200000,
  'gemini-pro': 32768,
  'gemini-1.5-pro': 1000000,
  'gemini-1.5-flash': 1000000,
} as const;

export interface OptimizationConfig {
  maxTotalTokens: number;        // Maximum tokens to send (including system prompt)
  charactersPerToken: number;    // Estimation ratio for text-to-token conversion
  minMessagesToKeep: number;     // Minimum recent messages to always preserve
  systemPromptBuffer: number;    // Reserved tokens for system prompt and overhead
  enableSummarization: boolean;  // Whether to include summaries of truncated content
  summarizationThreshold: number; // Messages to truncate before creating summary
}

/**
 * Gets optimization configuration based on model capabilities
 */
export function getOptimizationConfig(modelId: string): OptimizationConfig {
  const contextLimit = MODEL_CONTEXT_LIMITS[modelId as keyof typeof MODEL_CONTEXT_LIMITS] || 4096;
  
  // Use 60% of context window for conversation history to leave room for response
  const maxTotalTokens = Math.floor(contextLimit * 0.6);
  
  return {
    maxTotalTokens,
    charactersPerToken: 4,      // Conservative estimate
    minMessagesToKeep: 6,       // Keep at least 3 exchanges (6 messages)
    systemPromptBuffer: 800,    // Buffer for system prompt, tools, and overhead
    enableSummarization: contextLimit > 8000, // Only for larger context models
    summarizationThreshold: 10  // Summarize if truncating more than 10 messages
  };
}

/**
 * Optimizes conversation history based on model capabilities and token limits
 */
export function optimizeConversationHistory(
  messages: Message[], 
  systemPrompt: string = '', 
  modelId: string = 'gpt-3.5'
): {
  optimizedMessages: Message[];
  summary?: string;
  tokensEstimate: number;
  truncatedCount: number;
} {
  if (messages.length === 0) {
    return {
      optimizedMessages: [],
      tokensEstimate: 0,
      truncatedCount: 0
    };
  }

  const config = getOptimizationConfig(modelId);
  
  // Calculate available tokens for history
  const systemTokens = Math.ceil(systemPrompt.length / config.charactersPerToken);
  const availableTokens = config.maxTotalTokens - systemTokens - config.systemPromptBuffer;

  // Always keep minimum recent messages regardless of token count
  if (messages.length <= config.minMessagesToKeep) {
    const totalTokens = messages.reduce((sum, msg) => 
      sum + Math.ceil(msg.text.length / config.charactersPerToken), 0
    );
    
    return {
      optimizedMessages: messages,
      tokensEstimate: totalTokens,
      truncatedCount: 0
    };
  }

  // Calculate tokens for each message
  const messagesWithTokens = messages.map(msg => ({
    ...msg,
    estimatedTokens: Math.ceil(msg.text.length / config.charactersPerToken)
  }));

  // Start from the end and work backwards to keep most recent context
  const optimizedMessages: Message[] = [];
  let totalTokens = 0;

  for (let i = messagesWithTokens.length - 1; i >= 0; i--) {
    const message = messagesWithTokens[i];
    const newTotal = totalTokens + message.estimatedTokens;

    // Always include minimum recent messages
    const remainingMessages = messagesWithTokens.length - i;
    if (remainingMessages <= config.minMessagesToKeep) {
      optimizedMessages.unshift(message);
      totalTokens = newTotal;
      continue;
    }

    // Include if we have token budget
    if (newTotal <= availableTokens) {
      optimizedMessages.unshift(message);
      totalTokens = newTotal;
    } else {
      // Stop when we exceed token limit
      break;
    }
  }

  const truncatedCount = messages.length - optimizedMessages.length;
  let summary: string | undefined;

  // Create summary if we truncated significant content
  if (config.enableSummarization && truncatedCount >= config.summarizationThreshold) {
    const truncatedMessages = messages.slice(0, truncatedCount);
    summary = createConversationSummary(truncatedMessages, config);
  }

  if (truncatedCount > 0) {
    console.log(`📝 HISTORY OPTIMIZATION (${modelId}):`, {
      originalMessages: messages.length,
      keptMessages: optimizedMessages.length,
      truncatedCount,
      estimatedTokens: totalTokens,
      availableTokens,
      hasSummary: !!summary
    });
  }

  return {
    optimizedMessages,
    summary,
    tokensEstimate: totalTokens,
    truncatedCount
  };
}

/**
 * Creates a concise summary of truncated conversation history
 */
function createConversationSummary(truncatedMessages: Message[], config: OptimizationConfig): string {
  if (truncatedMessages.length === 0) return '';
  
  const messageCount = truncatedMessages.length;
  
  // Find key topics by looking at longer messages (likely more substantive)
  const substantiveMessages = truncatedMessages
    .filter(msg => msg.text.length > 50)
    .slice(0, 3); // Take first few substantial messages
  
  if (substantiveMessages.length === 0) {
    return `[Earlier conversation: ${messageCount} messages]`;
  }
  
  const topics = substantiveMessages
    .map(msg => msg.text.substring(0, 40) + (msg.text.length > 40 ? '...' : ''))
    .join(', ');
  
  return `[Earlier conversation (${messageCount} messages): discussed ${topics}]`;
}

/**
 * Estimates token count for a text string
 */
export function estimateTokenCount(text: string, charactersPerToken: number = 4): number {
  return Math.ceil(text.length / charactersPerToken);
}

/**
 * Checks if a conversation is approaching token limits
 */
export function shouldOptimizeConversation(
  messages: Message[], 
  systemPrompt: string = '', 
  modelId: string = 'gpt-3.5'
): boolean {
  const config = getOptimizationConfig(modelId);
  const totalTokens = messages.reduce((sum, msg) => 
    sum + estimateTokenCount(msg.text, config.charactersPerToken), 0
  );
  
  const systemTokens = estimateTokenCount(systemPrompt, config.charactersPerToken);
  const totalEstimate = totalTokens + systemTokens + config.systemPromptBuffer;
  
  // Start optimizing when we're at 80% of the limit
  return totalEstimate > (config.maxTotalTokens * 0.8);
}
