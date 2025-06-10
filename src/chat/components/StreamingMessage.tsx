import React, { memo, useMemo } from 'react';
import { MessageBubble } from '../MessageBubble';
import { Message } from '../types';

interface StreamingMessageProps {
  message: Message;
  streamingText: string;
  isStreaming: boolean;
}

// Separate component for streaming messages to isolate re-renders
export const StreamingMessage = memo(({ message, streamingText, isStreaming }: StreamingMessageProps) => {
  // Create a message with the current streaming text
  const streamingMessage = useMemo(() => ({
    ...message,
    text: streamingText || '',
    isStreaming,
  }), [message, streamingText, isStreaming]);

  return <MessageBubble message={streamingMessage} />;
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if streaming text or status changes
  return prevProps.streamingText === nextProps.streamingText && 
         prevProps.isStreaming === nextProps.isStreaming &&
         prevProps.message.id === nextProps.message.id;
});

StreamingMessage.displayName = 'StreamingMessage';