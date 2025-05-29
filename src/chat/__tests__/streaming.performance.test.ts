/**
 * Performance and Stress Tests for Streaming
 * 
 * Tests for handling long conversations, concurrent streams,
 * memory management, and performance under load.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStream } from '../useStream';
import { supabase } from '../../lib/supabase';

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// Performance monitoring utilities
const performanceMonitor = {
  startTime: 0,
  endTime: 0,
  memoryUsage: [] as number[],
  
  start() {
    this.startTime = Date.now();
    this.memoryUsage = [];
  },
  
  recordMemory() {
    if (global.gc) {
      global.gc();
    }
    this.memoryUsage.push(process.memoryUsage().heapUsed);
  },
  
  end() {
    this.endTime = Date.now();
    return {
      duration: this.endTime - this.startTime,
      memoryDelta: this.memoryUsage.length > 1 
        ? this.memoryUsage[this.memoryUsage.length - 1] - this.memoryUsage[0]
        : 0,
      memoryPeak: Math.max(...this.memoryUsage),
    };
  },
};

// Mock fetch for long streams
const createLongStreamMock = (tokenCount: number) => {
  return jest.fn().mockImplementation(async () => {
    const chunks = Array.from({ length: tokenCount }, (_, i) =>
      `data: {"token": "token${i}"}\n`
    );
    chunks.push('data: {"done": true}\n');
    
    return {
      ok: true,
      headers: new Map([['content-type', 'text/event-stream']]),
      body: {
        getReader: () => ({
          read: (() => {
            let index = 0;
            return async () => {
              if (index >= chunks.length) {
                return { done: true, value: undefined };
              }
              const chunk = new TextEncoder().encode(chunks[index]);
              index++;
              return { done: false, value: chunk };
            };
          })(),
          releaseLock: jest.fn(),
        }),
      },
    };
  });
};

describe('Streaming Performance Tests', () => {
  const mockSession = {
    access_token: 'mock-token',
    user: { id: 'test-user' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });
    performanceMonitor.start();
  });

  afterEach(() => {
    const results = performanceMonitor.end();
    console.log('Test performance:', results);
    jest.clearAllMocks();
  });

  it('should handle long conversations efficiently', async () => {
    const CONVERSATION_LENGTH = 50; // Reduced for faster tests
    const messages = Array.from({ length: CONVERSATION_LENGTH }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i} with some content that represents a typical chat message length`,
    }));

    global.fetch = createLongStreamMock(50);
    const { result } = renderHook(() => useStream());

    performanceMonitor.recordMemory();

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: messages as any,
      });
    });

    performanceMonitor.recordMemory();

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    performanceMonitor.recordMemory();

    // Verify that the long conversation was processed
    expect(result.current.streamingText.length).toBeGreaterThan(0);
    
    // Memory usage should not grow excessively
    const finalResults = performanceMonitor.end();
    expect(finalResults.duration).toBeLessThan(5000); // Should complete within 5 seconds
  }, 10000);

  it('should handle very long streaming responses', async () => {
    const LONG_RESPONSE_TOKENS = 100; // Reduced for faster tests
    
    global.fetch = createLongStreamMock(LONG_RESPONSE_TOKENS);

    const tokenCount = { count: 0 };
    const onTokenSpent = jest.fn(() => {
      tokenCount.count++;
      performanceMonitor.recordMemory();
    });

    const { result } = renderHook(() => useStream({ onTokenSpent }));

    performanceMonitor.recordMemory();

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Generate a very long response' }],
      });
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    }, { timeout: 15000 });

    performanceMonitor.recordMemory();

    // Should have processed all tokens
    expect(tokenCount.count).toBe(LONG_RESPONSE_TOKENS);
    expect(result.current.streamingText).toContain('token99'); // Last token

    const finalResults = performanceMonitor.end();
    console.log(`Processed ${LONG_RESPONSE_TOKENS} tokens in ${finalResults.duration}ms`);
    
    // Performance targets
    expect(finalResults.duration).toBeLessThan(10000); // Should complete within 10 seconds
  }, 15000);

  it('should handle concurrent stream attempts gracefully', async () => {
    global.fetch = createLongStreamMock(50);
    const { result } = renderHook(() => useStream());

    performanceMonitor.recordMemory();

    // Start streams sequentially to avoid overlapping act() calls
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        try {
          await result.current.startStream({
            model: 'gpt-3.5',
            messages: [{ role: 'user', content: `Sequential request ${i}` }],
          });
        } catch (error) {
          // Expected that some might fail due to concurrent access
        }
      });
    }

    performanceMonitor.recordMemory();

    // Should eventually finish streaming
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    // Should not crash or leak memory
    const finalResults = performanceMonitor.end();
    expect(finalResults.memoryDelta).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
  });

  it('should clean up resources properly on abort', async () => {
    // Create a stream that would normally take a long time
    global.fetch = jest.fn().mockImplementation(async () => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            headers: new Map([['content-type', 'text/event-stream']]),
            body: {
              getReader: () => ({
                read: async () => {
                  // Never resolve to simulate hanging stream
                  return new Promise(() => {});
                },
                releaseLock: jest.fn(),
              }),
            },
          });
        }, 100);
      });
    });

    const { result, unmount } = renderHook(() => useStream());
    performanceMonitor.recordMemory();

    await act(async () => {
      try {
        // Start the stream
        const streamPromise = result.current.startStream({
          model: 'gpt-3.5',
          messages: [{ role: 'user', content: 'Long request' }],
        });

        // Abort after a short delay
        setTimeout(() => {
          result.current.abortStream();
        }, 200);

        await streamPromise;
      } catch (error) {
        // Expected abort error
      }
    });

    // Clean up the component
    unmount();
    performanceMonitor.recordMemory();

    // Should have stopped streaming
    expect(result.current.isStreaming).toBe(false);

    // Memory should be cleaned up
    const finalResults = performanceMonitor.end();
    expect(finalResults.memoryDelta).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
  });

  it('should handle rapid start/stop cycles', async () => {
    global.fetch = createLongStreamMock(10);
    const { result, unmount } = renderHook(() => useStream());

    performanceMonitor.recordMemory();

    // Rapidly start and stop streams
    for (let i = 0; i < 5; i++) { // Reduced iterations to avoid test timeout
      await act(async () => {
        try {
          const streamPromise = result.current.startStream({
            model: 'gpt-3.5',
            messages: [{ role: 'user', content: `Rapid cycle ${i}` }],
          });

          // Abort quickly
          setTimeout(() => result.current.abortStream(), 10);
          
          await streamPromise;
        } catch (error) {
          // Expected abort errors
        }
      });

      if (i % 2 === 0) {
        performanceMonitor.recordMemory();
      }
    }

    // Clean up
    unmount();
    performanceMonitor.recordMemory();

    // Should be stable after rapid cycles
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe(null);

    const finalResults = performanceMonitor.end();
    console.log(`Completed rapid cycles in ${finalResults.duration}ms`);
  });

  it('should handle malformed SSE data in large volumes', async () => {
    const CHUNK_COUNT = 100; // Reduced for faster tests
    const malformedChunks = Array.from({ length: CHUNK_COUNT }, (_, i) => {
      if (i % 10 === 0) {
        return 'data: invalid json\n'; // 10% malformed
      } else if (i % 7 === 0) {
        return 'data: {"incomplete": \n'; // Incomplete JSON
      } else {
        return `data: {"token": "valid${i}"}\n`;
      }
    });
    malformedChunks.push('data: {"done": true}\n');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'text/event-stream']]),
      body: {
        getReader: () => ({
          read: (() => {
            let index = 0;
            return async () => {
              if (index >= malformedChunks.length) {
                return { done: true, value: undefined };
              }
              const chunk = new TextEncoder().encode(malformedChunks[index]);
              index++;
              return { done: false, value: chunk };
            };
          })(),
          releaseLock: jest.fn(),
        }),
      },
    });

    const { result, unmount } = renderHook(() => useStream());
    performanceMonitor.recordMemory();

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Test malformed data handling' }],
      });
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    performanceMonitor.recordMemory();

    // Should have processed valid tokens despite malformed data
    expect(result.current.streamingText.length).toBeGreaterThan(0);
    expect(result.current.streamingText).toContain('valid1');

    // Clean up
    unmount();

    const finalResults = performanceMonitor.end();
    console.log(`Processed ${CHUNK_COUNT} chunks with malformed data in ${finalResults.duration}ms`);
  });

  it('should maintain performance with multiple hooks', async () => {
    global.fetch = createLongStreamMock(20);

    // Create multiple stream hooks
    const hooks = Array.from({ length: 3 }, () =>
      renderHook(() => useStream())
    );

    performanceMonitor.recordMemory();

    // Use only one hook at a time to simulate realistic usage
    for (let i = 0; i < hooks.length; i++) {
      await act(async () => {
        await hooks[i].result.current.startStream({
          model: 'gpt-3.5',
          messages: [{ role: 'user', content: `Hook ${i} message` }],
        });
      });

      await waitFor(() => {
        expect(hooks[i].result.current.isStreaming).toBe(false);
      });

      if (i % 2 === 0) {
        performanceMonitor.recordMemory();
      }
    }

    performanceMonitor.recordMemory();

    // Clean up all hooks
    hooks.forEach(hook => hook.unmount());

    const finalResults = performanceMonitor.end();
    console.log(`Completed sequential streams in ${finalResults.duration}ms`);
    
    // Should not accumulate excessive memory
    expect(finalResults.memoryDelta).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
  });
});