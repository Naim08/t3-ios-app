import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetch } from 'expo/fetch';

// Memory management constants for streaming - AGGRESSIVE LIMITS
const MAX_STREAMING_TOKENS = 2000; // Maximum tokens in display buffer (array-based)
const MAX_ACCUMULATED_TOKENS = 4000; // Maximum tokens in complete response buffer
const MEMORY_CHECK_INTERVAL = 500; // Check memory every 500 tokens (more frequent)
const BUFFER_CLEANUP_THRESHOLD = 4096; // 4KB buffer cleanup threshold
const RENDER_THROTTLE_MS = 100; // Throttle UI updates to every 100ms

export interface StreamMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

interface StreamRequest {
  model: string;
  messages: StreamMessage[];
  customApiKey?: string;
  personaId?: string;
  conversationId?: string; // ✅ Add conversation ID to stream request
}

interface StreamChunk {
  token?: string;
  error?: string;
  done?: boolean;
  role?: 'tool';
  tool_call_id?: string;
  name?: string;
  content?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_cost: number;
  };
}

interface UseStreamOptions {
  onTokenSpent?: (tokens: number) => void;
  onError?: (error: string) => void;
  onComplete?: (usage?: StreamChunk['usage'], finalContent?: string) => void;
  onToolResult?: (toolResult: { tool_call_id: string; name: string; content: string }) => void;
  onStart?: (conversationId?: string) => void; // ✅ Pass conversation ID to onStart
}

interface UseStreamResult {
  isStreaming: boolean;
  streamingText: string; // Backward compatibility
  displayedText: string; // New optimized text display
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

  // ✅ Array-based token accumulation to prevent O(n²) memory growth
  const accumulatedTokensRef = useRef<string[]>([]);
  const [displayedText, setDisplayedText] = useState('');

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastRequestRef = useRef<StreamRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memory management state
  const tokenCountRef = useRef<number>(0);
  const lastMemoryCheckRef = useRef<number>(0);
  
  // Throttled rendering to reduce bridge overhead
  const updateDisplayThrottleRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateDisplayedText = useCallback(() => {
    // Clear any pending update
    if (updateDisplayThrottleRef.current) {
      clearTimeout(updateDisplayThrottleRef.current);
    }
    
    // Throttle updates to reduce React Native bridge overhead
    updateDisplayThrottleRef.current = setTimeout(() => {
      const joinedText = accumulatedTokensRef.current.join('');
      setDisplayedText(joinedText);
      setStreamingText(joinedText); // Keep backward compatibility
    }, RENDER_THROTTLE_MS);
  }, []);
  
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear any pending display update
    if (updateDisplayThrottleRef.current) {
      clearTimeout(updateDisplayThrottleRef.current);
      updateDisplayThrottleRef.current = null;
    }

    // Reset memory tracking state
    tokenCountRef.current = 0;
    lastMemoryCheckRef.current = 0;
    
    // AGGRESSIVE CLEANUP: Clear all text refs and arrays
    accumulatedTokensRef.current = [];
    setDisplayedText('');
    setStreamingText('');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🗑️ MEMORY: Forced garbage collection during cleanup');
    }
  }, []);

  // Memory-safe token addition with array-based accumulation
  const addToken = useCallback((token: string) => {
    // Increment token counter for memory monitoring
    tokenCountRef.current += 1;

    // Add token to array (O(1) operation, no string concatenation)
    accumulatedTokensRef.current.push(token);

    // Implement circular buffer to prevent unbounded growth
    if (accumulatedTokensRef.current.length > MAX_ACCUMULATED_TOKENS) {
      // Remove oldest tokens to maintain fixed buffer size
      const tokensToRemove = accumulatedTokensRef.current.length - MAX_ACCUMULATED_TOKENS;
      accumulatedTokensRef.current.splice(0, tokensToRemove);
      console.log(`🧹 MEMORY: Removed ${tokensToRemove} old tokens to prevent memory bloat`);
    }

    // Throttled display update to reduce bridge overhead
    updateDisplayedText();

    // Periodic memory check following existing patterns
    if (tokenCountRef.current - lastMemoryCheckRef.current >= MEMORY_CHECK_INTERVAL) {
      lastMemoryCheckRef.current = tokenCountRef.current;

      // Check memory usage if available (React Native/Web)
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);

        // Lower threshold for more aggressive cleanup on mobile
        if (usedMB > 150) { // 150MB threshold for mobile (reduced from 200MB)
          if (__DEV__) {
            console.warn(`⚠️ MEMORY: High usage detected: ${usedMB.toFixed(1)}MB during streaming`);
          }

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
            if (__DEV__) {
              console.log('🗑️ MEMORY: Forced garbage collection during streaming');
            }
          }

          // Additional cleanup for React Native
          if (typeof global !== 'undefined' && global.nativeFlushQueueImmediate) {
            global.nativeFlushQueueImmediate([]);
          }
        }
      }
    }
  }, [updateDisplayedText]);

  // Helper function to process SSE lines - optimized for performance
  const processSSELine = useCallback((line: string, addToken: (token: string) => void, options: UseStreamOptions) => {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.slice(6);

        // Quick check for common patterns to avoid unnecessary parsing
        if (jsonStr === '{"done":true}') {
          const finalText = accumulatedTokensRef.current.join('');
          options.onComplete?.(undefined, finalText);
          return { shouldStop: true };
        }

        const data: StreamChunk = JSON.parse(jsonStr);

        if (data.error) {
          if (data.error === 'insufficient_credits') {
            options.onError?.('Out of credits. Please purchase more tokens.');
            return { shouldStop: true };
          }
          throw new Error(data.error);
        }

        // Handle tool results
        if (data.role === 'tool' && data.tool_call_id && data.name && data.content) {
          if (__DEV__) {
            console.log('🎯 useStream: Tool result detected:', data.name);
            console.log('🎯 useStream: Calling onToolResult callback');
          }
          options.onToolResult?.({
            tool_call_id: data.tool_call_id,
            name: data.name,
            content: data.content
          });
          return { shouldStop: false };
        }

        if (data.token && typeof data.token === 'string') {
          // Only add non-empty tokens
          if (data.token.length > 0) {
            addToken(data.token);
            options.onTokenSpent?.(1); // Report each token spent
          }
        }

        if (data.done) {
          const finalText = accumulatedTokensRef.current.join('');
          options.onComplete?.(data.usage, finalText);
          return { shouldStop: true };
        }
      } catch (parseError) {
        if (__DEV__) {
          console.warn('Failed to parse SSE data:', line, parseError);
        }
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
      setDisplayedText(''); 
      accumulatedTokensRef.current = []; // ✅ Reset array instead of string
      setError(null);
      lastRequestRef.current = request;

      // Reset memory tracking state for new stream
      tokenCountRef.current = 0;
      lastMemoryCheckRef.current = 0;

      // Call onStart callback when stream begins
      options.onStart?.(request.conversationId);

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
      
      console.log('🚀 CALLING GATEWAY:', {
        url: gatewayUrl,
        personaId: request.personaId,
        model: request.model,
        messageCount: request.messages?.length
      });
      
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
      
      console.log('🚀 GATEWAY RESPONSE:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
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

      // Use expo/fetch streaming approach with optimized buffer management
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const MAX_BUFFER_SIZE = BUFFER_CLEANUP_THRESHOLD; // Use constant from top of file

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // Decode the Uint8Array chunk to string
          const chunk = decoder.decode(value, { stream: true });

          // Add to buffer and process complete lines
          buffer += chunk;

          // Prevent buffer from growing too large - more aggressive cleanup
          if (buffer.length > MAX_BUFFER_SIZE) {
            if (__DEV__) {
              console.warn('⚠️ STREAM: Buffer size exceeded, forcing line processing');
            }
            // Force process even if no complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const result = processSSELine(line, addToken, options);
              if (result.shouldStop) {
                reader.releaseLock();
                // Clear buffer before returning
                buffer = '';
                return;
              }
            }
          } else {
            const lines = buffer.split('\n');

            // Keep the last incomplete line in buffer
            buffer = lines.pop() || '';

            // Process complete lines
            for (const line of lines) {
              const result = processSSELine(line, addToken, options);
              if (result.shouldStop) {
                reader.releaseLock();
                // Clear buffer before returning
                buffer = '';
                return;
              }
            }
          }
        }

        // Process any remaining content in buffer
        if (buffer.trim()) {
          const result = processSSELine(buffer, addToken, options);
          if (result.shouldStop) {
            buffer = '';
            return;
          }
        }

      } finally {
        reader.releaseLock();
        // Clear buffer to free memory
        buffer = '';
        
        // Force garbage collection after stream completion
        if (global.gc) {
          global.gc();
          console.log('🗑️ MEMORY: Forced garbage collection after stream completion');
        }
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
    streamingText, // Backward compatibility
    displayedText, // New optimized display
    error,
    startStream,
    abortStream,
    retryStream,
  };
}
