import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetch } from 'expo/fetch';

interface StreamMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamRequest {
  model: string;
  messages: StreamMessage[];
  customApiKey?: string;
}

interface StreamChunk {
  token?: string;
  error?: string;
  done?: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_cost: number;
  };
}

interface UseStreamOptions {
  onTokenSpent?: (tokens: number) => void;
  onError?: (error: string) => void;
  onComplete?: (usage?: StreamChunk['usage']) => void;
}

interface UseStreamResult {
  isStreaming: boolean;
  streamingText: string;
  error: string | null;
  startStream: (request: StreamRequest) => Promise<void>;
  abortStream: () => void;
  retryStream: () => void;
}

export function useStream(options: UseStreamOptions = {}): UseStreamResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastRequestRef = useRef<StreamRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Enhanced buffering for smooth rendering
  const pendingTokensRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingTokensRef.current = '';
  }, []);

  // Smooth token buffering with RAF
  const flushPendingTokens = useCallback(() => {
    if (pendingTokensRef.current) {
      setStreamingText(prev => prev + pendingTokensRef.current);
      pendingTokensRef.current = '';
    }
    rafIdRef.current = null;
  }, []);

  const addToken = useCallback((token: string) => {
    pendingTokensRef.current += token;
    
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(flushPendingTokens);
    }
  }, [flushPendingTokens]);

  // Helper function to process SSE lines
  const processSSELine = useCallback((line: string, addToken: (token: string) => void, options: UseStreamOptions) => {
    if (line.startsWith('data: ')) {
      try {
        const data: StreamChunk = JSON.parse(line.slice(6));
        
        if (data.error) {
          if (data.error === 'insufficient_credits') {
            options.onError?.('Out of credits. Please purchase more tokens.');
            return { shouldStop: true };
          }
          throw new Error(data.error);
        }
        
        if (data.token && typeof data.token === 'string') {
          // Only add non-empty tokens
          if (data.token.length > 0) {
            addToken(data.token);
            options.onTokenSpent?.(1); // Report each token spent
          }
        }
        
        if (data.done) {
          options.onComplete?.(data.usage);
          return { shouldStop: true };
        }
      } catch (parseError) {
        console.warn('Failed to parse SSE data:', line, parseError);
      }
    }
    return { shouldStop: false };
  }, []);

  const abortStream = useCallback(() => {
    cleanup();
    setIsStreaming(false);
    setError(null);
  }, [cleanup]);

  const startStream = useCallback(async (request: StreamRequest) => {
    try {
      setIsStreaming(true);
      setStreamingText('');
      setError(null);
      lastRequestRef.current = request;

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const authError = 'Authentication required';
        setError(authError);
        options.onError?.(authError);
        throw new Error(authError);
      }

      // Clean up any existing connections
      cleanup();

      abortControllerRef.current = new AbortController();

      // Call gateway to initiate stream
      const gatewayUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gateway`;
      
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        
        // Check for 5xx errors and retry
        if (response.status >= 500 && retryCount < 3) {
          const backoffDelay = Math.pow(2, retryCount) * 1000;
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            startStream(request);
          }, backoffDelay);
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Check if response is actually streamed
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/event-stream')) {
        throw new Error('Expected streaming response');
      }

      // React Native streaming with expo/fetch
      if (!response.body) {
        throw new Error('No response body available');
      }

      // Use expo/fetch streaming approach
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          // Decode the Uint8Array chunk to string
          const chunk = decoder.decode(value, { stream: true });
          
          // Add to buffer and process complete lines
          buffer += chunk;
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';
          
          // Process complete lines
          for (const line of lines) {
            const result = processSSELine(line, addToken, options);
            if (result.shouldStop) {
              reader.releaseLock();
              return;
            }
          }
        }
        
        // Process any remaining content in buffer
        if (buffer.trim()) {
          const result = processSSELine(buffer, addToken, options);
          if (result.shouldStop) return;
        }
        
      } finally {
        reader.releaseLock();
      }
      
    } catch (err: any) {
      console.error('Stream error:', err);
      
      // Handle different error types
      if (err.name === 'AbortError') {
        return; // User cancelled, don't show error
      }
      
      const errorMessage = err.message || 'Streaming failed';
      setError(errorMessage);
      options.onError?.(errorMessage);
      
    } finally {
      setIsStreaming(false);
      cleanup();
    }
  }, [cleanup, options, retryCount, addToken, processSSELine]);

  const retryStream = useCallback(() => {
    if (lastRequestRef.current) {
      setRetryCount(0); // Reset retry count for manual retry
      startStream(lastRequestRef.current);
    }
  }, [startStream]);

  // Cleanup on unmount or navigation
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isStreaming,
    streamingText,
    error,
    startStream,
    abortStream,
    retryStream,
  };
}
