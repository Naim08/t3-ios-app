/**
 * Unified conversation and message types
 * Consolidates types from chat/types.ts and services/conversationService.ts
 */

// Base message interface used across the app
export interface Message {
  id: string;
  conversationId?: string; // Optional for backward compatibility
  conversation_id?: string; // Database field name
  role: 'user' | 'assistant' | 'system';
  content: string;
  text?: string; // Alias for content, for backward compatibility
  createdAt: string;
  created_at?: string; // Database field name
  modelUsed?: string | null;
  model_used?: string | null; // Database field name
  isStreaming?: boolean;
  toolResponse?: {
    type: string;
    data: any;
  };
  toolCalls?: {
    [toolName: string]: {
      called_at: string;
      success: boolean;
      data?: any;
    };
  };
  tool_calls?: object | null; // Database field format
}

// Streaming message format from API
export interface StreamMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

// Conversation with persona information
export interface ConversationWithPersona {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_preview: string | null;
  message_count: number;
  current_model: string | null;
  persona_id: string | null;
  user_id: string;
  personas?: {
    id: string;
    display_name: string;
    icon: string;
    system_prompt: string;
    default_model: string;
    requires_premium: boolean;
  } | null;
}

// Error handling type
export interface ConversationServiceError {
  type: 'network' | 'database' | 'permission' | 'unknown';
  message: string;
  originalError?: any;
}

// Type guards and converters
export function toDatabaseMessage(message: Message): Message {
  return {
    ...message,
    conversation_id: message.conversationId || message.conversation_id,
    content: message.text || message.content,
    created_at: message.createdAt || message.created_at || new Date().toISOString(),
    model_used: message.modelUsed || message.model_used,
    tool_calls: message.toolCalls || message.tool_calls,
  };
}

export function fromDatabaseMessage(dbMessage: Message): Message {
  return {
    ...dbMessage,
    conversationId: dbMessage.conversation_id || dbMessage.conversationId,
    text: dbMessage.content || dbMessage.text,
    createdAt: dbMessage.created_at || dbMessage.createdAt || new Date().toISOString(),
    modelUsed: dbMessage.model_used || dbMessage.modelUsed,
    toolCalls: dbMessage.tool_calls || dbMessage.toolCalls,
  };
}