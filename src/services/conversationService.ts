import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

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

export interface DatabaseMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used: string | null;
  created_at: string;
}

export interface ConversationServiceError {
  type: 'network' | 'database' | 'permission' | 'unknown';
  message: string;
  originalError?: any;
}

/**
 * Centralized conversation service to eliminate duplication across components
 */
export class ConversationService {
  /**
   * Delete a conversation with consistent error handling
   */
  static async deleteConversation(conversationId: string): Promise<{ success: boolean; error?: ConversationServiceError }> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        console.error('❌ Error deleting conversation:', error);
        
        const serviceError: ConversationServiceError = {
          type: 'database',
          message: 'Failed to delete conversation',
          originalError: error
        };
        
        return { success: false, error: serviceError };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Unexpected error deleting conversation:', error);
      
      const serviceError: ConversationServiceError = {
        type: 'unknown',
        message: 'An unexpected error occurred while deleting the conversation',
        originalError: error
      };
      
      return { success: false, error: serviceError };
    }
  }

  /**
   * Delete conversation with user confirmation dialog
   */
  static async deleteConversationWithConfirmation(
    conversationId: string,
    onSuccess?: () => void
  ): Promise<void> {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await this.deleteConversation(conversationId);
            
            if (result.success) {
              onSuccess?.();
            } else {
              Alert.alert('Error', result.error?.message || 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  }

  /**
   * Fetch all conversations for the current user
   */
  static async fetchConversations(): Promise<{ data?: ConversationWithPersona[]; error?: ConversationServiceError }> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          personas (
            id,
            display_name,
            icon,
            system_prompt,
            default_model,
            requires_premium
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching conversations:', error);
        
        const serviceError: ConversationServiceError = {
          type: 'database',
          message: 'Failed to load conversations',
          originalError: error
        };
        
        return { error: serviceError };
      }

      return { data: data || [] };
    } catch (error) {
      console.error('❌ Unexpected error fetching conversations:', error);
      
      const serviceError: ConversationServiceError = {
        type: 'unknown',
        message: 'An unexpected error occurred while loading conversations',
        originalError: error
      };
      
      return { error: serviceError };
    }
  }

  /**
   * Fetch a single conversation with full details
   */
  static async fetchConversation(conversationId: string): Promise<{ data?: ConversationWithPersona; error?: ConversationServiceError }> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          *,
          personas (
            id,
            display_name,
            icon,
            system_prompt,
            default_model,
            requires_premium
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('❌ Error fetching conversation:', error);
        
        const serviceError: ConversationServiceError = {
          type: 'database',
          message: 'Failed to load conversation',
          originalError: error
        };
        
        return { error: serviceError };
      }

      return { data: conversation };
    } catch (error) {
      console.error('❌ Unexpected error fetching conversation:', error);
      
      const serviceError: ConversationServiceError = {
        type: 'unknown',
        message: 'An unexpected error occurred while loading the conversation',
        originalError: error
      };
      
      return { error: serviceError };
    }
  }

  /**
   * Fetch messages for a conversation
   */
  static async fetchMessages(conversationId: string): Promise<{ data?: DatabaseMessage[]; error?: ConversationServiceError }> {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching messages:', error);
        
        const serviceError: ConversationServiceError = {
          type: 'database',
          message: 'Failed to load messages',
          originalError: error
        };
        
        return { error: serviceError };
      }

      return { data: messagesData || [] };
    } catch (error) {
      console.error('❌ Unexpected error fetching messages:', error);
      
      const serviceError: ConversationServiceError = {
        type: 'unknown',
        message: 'An unexpected error occurred while loading messages',
        originalError: error
      };
      
      return { error: serviceError };
    }
  }

  /**
   * Create a new conversation
   */
  static async createConversation(data: {
    title: string;
    persona_id?: string;
    current_model?: string;
  }): Promise<{ data?: { id: string }; error?: ConversationServiceError }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        const serviceError: ConversationServiceError = {
          type: 'permission',
          message: 'User not authenticated'
        };
        return { error: serviceError };
      }

      const conversationData = {
        user_id: user.user.id,
        title: data.title,
        persona_id: data.persona_id || null,
        current_model: data.current_model || null,
        message_count: 0,
        last_message_preview: null,
      };

      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating conversation:', error);
        
        const serviceError: ConversationServiceError = {
          type: 'database',
          message: 'Failed to create conversation',
          originalError: error
        };
        
        return { error: serviceError };
      }

      return { data: newConv };
    } catch (error) {
      console.error('❌ Unexpected error creating conversation:', error);
      
      const serviceError: ConversationServiceError = {
        type: 'unknown',
        message: 'An unexpected error occurred while creating the conversation',
        originalError: error
      };
      
      return { error: serviceError };
    }
  }

  /**
   * Update conversation model
   */
  static async updateConversationModel(conversationId: string, modelId: string): Promise<{ success: boolean; error?: ConversationServiceError }> {
    try {
      const { data, error } = await supabase.rpc('update_conversation_model', {
        conversation_uuid: conversationId,
        new_model: modelId
      });

      if (error) {
        console.error('❌ Error updating conversation model:', error);
        
        const serviceError: ConversationServiceError = {
          type: 'database',
          message: 'Failed to update conversation model',
          originalError: error
        };
        
        return { success: false, error: serviceError };
      }

      if (!data) {
        console.warn('⚠️ Model update returned false - conversation not found or no permission');
        
        const serviceError: ConversationServiceError = {
          type: 'permission',
          message: 'Conversation not found or no permission to update'
        };
        
        return { success: false, error: serviceError };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Unexpected error updating conversation model:', error);
      
      const serviceError: ConversationServiceError = {
        type: 'unknown',
        message: 'An unexpected error occurred while updating the conversation',
        originalError: error
      };
      
      return { success: false, error: serviceError };
    }
  }

  /**
   * Handle service errors with user-friendly alerts
   */
  static handleError(error: ConversationServiceError, operation: string = 'operation'): void {
    console.error(`❌ ConversationService error during ${operation}:`, error);
    
    // Could be extended to show different messages based on error type
    let message = error.message;
    
    if (error.type === 'network') {
      message = 'Please check your internet connection and try again.';
    } else if (error.type === 'permission') {
      message = 'You don\'t have permission to perform this action.';
    }
    
    Alert.alert('Error', message);
  }
}