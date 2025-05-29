/**
 * useStream Hook Tests - Essential Tests Only
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

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Simple mock for streaming responses
class MockReadableStream {
  private chunks: string[];
  private index = 0;

  constructor(chunks: string[]) {
    this.chunks = chunks;
  }

  getReader() {
    return {
      read: async () => {
        if (this.index >= this.chunks.length) {
          return { done: true, value: undefined };
        }
        const chunk = new TextEncoder().encode(this.chunks[this.index]);
        this.index++;
        return { done: false, value: chunk };
      },
      releaseLock: jest.fn(),
    };
  }
}

describe('useStream', () => {
  const mockSession = {
    access_token: 'mock-token',
    user: { id: 'test-user' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useStream());

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingText).toBe('');
    expect(result.current.error).toBe(null);
    expect(typeof result.current.startStream).toBe('function');
    expect(typeof result.current.abortStream).toBe('function');
    expect(typeof result.current.retryStream).toBe('function');
  });

  it('should start streaming successfully', async () => {
    const mockChunks = [
      'data: {"token": "Hello"}\n',
      'data: {"token": " world"}\n',
      'data: {"done": true, "usage": {"total_cost": 0.001}}\n',
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'text/event-stream']]),
      body: new MockReadableStream(mockChunks),
    });

    const onTokenSpent = jest.fn();
    const onComplete = jest.fn();

    const { result } = renderHook(() => 
      useStream({ onTokenSpent, onComplete })
    );

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    expect(result.current.streamingText).toBe('Hello world');
    expect(onTokenSpent).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalledWith({ total_cost: 0.001 });
  });

  it('should handle authentication errors', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    const onError = jest.fn();
    const { result } = renderHook(() => useStream({ onError }));

    await act(async () => {
      try {
        await result.current.startStream({
          model: 'gpt-3.5',
          messages: [{ role: 'user', content: 'Hello' }],
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(onError).toHaveBeenCalledWith('Authentication required');
  });

  it('should handle HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid request' }),
    });

    const onError = jest.fn();
    const { result } = renderHook(() => useStream({ onError }));

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid request');
    });

    expect(onError).toHaveBeenCalledWith('Invalid request');
  });

  it('should handle insufficient credits error', async () => {
    const mockChunks = [
      'data: {"error": "insufficient_credits"}\n',
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'text/event-stream']]),
      body: new MockReadableStream(mockChunks),
    });

    const onError = jest.fn();
    const { result } = renderHook(() => useStream({ onError }));

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    expect(onError).toHaveBeenCalledWith('Out of credits. Please purchase more tokens.');
  });

  it('should retry on 5xx errors with exponential backoff', async () => {
    // First call fails with 500
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    // Second call succeeds
    const mockChunks = [
      'data: {"token": "Retry"}\n',
      'data: {"done": true}\n',
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'text/event-stream']]),
      body: new MockReadableStream(mockChunks),
    });

    const { result } = renderHook(() => useStream());

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    // Wait for retry
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(result.current.streamingText).toBe('Retry');
    });
  });

  it('should abort streaming', async () => {
    const abortController = new AbortController();
    const mockChunks = [
      'data: {"token": "Hello"}\n',
      // This should be interrupted
    ];

    mockFetch.mockImplementationOnce(async (url, options) => {
      // Simulate abort during fetch
      setTimeout(() => abortController.abort(), 50);
      return {
        ok: true,
        headers: new Map([['content-type', 'text/event-stream']]),
        body: new MockReadableStream(mockChunks),
      };
    });

    const { result } = renderHook(() => useStream());

    await act(async () => {
      const streamPromise = result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      // Abort after starting
      setTimeout(() => result.current.abortStream(), 10);
      
      await streamPromise;
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useStream());
    
    // Should not throw
    unmount();
  });

  it('should handle malformed SSE data gracefully', async () => {
    const mockChunks = [
      'data: {"token": "Valid"}\n',
      'data: invalid json\n', // Malformed data
      'data: {"token": " data"}\n',
      'data: {"done": true}\n',
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'text/event-stream']]),
      body: new MockReadableStream(mockChunks),
    });

    const { result } = renderHook(() => useStream());

    // Ensure clean state
    expect(result.current.streamingText).toBe('');

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Test malformed' }],
      });
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    // Should continue processing valid chunks despite malformed one
    expect(result.current.streamingText).toBe('Valid data');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const onError = jest.fn();
    const { result } = renderHook(() => useStream({ onError }));

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    expect(onError).toHaveBeenCalledWith('Network error');
  });

  it('should retry stream with last request', async () => {
    // Initial request fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' }),
    });

    const { result } = renderHook(() => useStream());

    await act(async () => {
      await result.current.startStream({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    // Retry should use the same request
    const mockChunks = [
      'data: {"token": "Retry successful"}\n',
      'data: {"done": true}\n',
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'text/event-stream']]),
      body: new MockReadableStream(mockChunks),
    });

    await act(async () => {
      result.current.retryStream();
    });

    await waitFor(() => {
      expect(result.current.streamingText).toBe('Retry successful');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
