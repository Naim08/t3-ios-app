import React, { memo, useMemo } from 'react';
import { MessageBubble } from '../MessageBubble';
import { Message } from '../types';

interface StreamingMessageProps {
  message: Message;
  streamingText: string;
  isStreaming: boolean;
  toolCalls?: { [toolName: string]: { called_at: string; success: boolean; data?: any } };
}

// Separate component for streaming messages to isolate re-renders
export const StreamingMessage = memo(({ message, streamingText, isStreaming, toolCalls }: StreamingMessageProps) => {
  // Create a message with the current streaming text and tool calls
  const streamingMessage = useMemo(() => ({
    ...message,
    text: streamingText || '',
    isStreaming,
    toolCalls: toolCalls || message.toolCalls, // Use provided toolCalls or fallback to message.toolCalls
  }), [message, streamingText, isStreaming, toolCalls]);

  return <MessageBubble message={streamingMessage} />;
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if streaming text, status, or tool calls change
  return prevProps.streamingText === nextProps.streamingText &&
         prevProps.isStreaming === nextProps.isStreaming &&
         prevProps.message.id === nextProps.message.id &&
         JSON.stringify(prevProps.toolCalls) === JSON.stringify(nextProps.toolCalls);
});

StreamingMessage.displayName = 'StreamingMessage';