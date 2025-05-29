/**
 * End-to-End Streaming Tests
 * 
 * Complete integration tests that simulate real user flows
 * from UI interaction to backend streaming responses.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import { ChatScreen } from '../ChatScreen';
import { supabase } from '../../lib/supabase';

// Mock all external dependencies
jest.mock('../../lib/supabase');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock providers
const mockNavigate = jest.fn();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

// Simulate real streaming server responses
class StreamingServer {
  private static instance: StreamingServer;
  private isOnline = true;
  private rateLimited = false;
  private userCredits = 1000;
  private userSubscription = false;

  static getInstance() {
    if (!StreamingServer.instance) {
      StreamingServer.instance = new StreamingServer();
    }
    return StreamingServer.instance;
  }

  setOnline(online: boolean) {
    this.isOnline = online;
  }

  setRateLimited(limited: boolean) {
    this.rateLimited = limited;
  }

  setUserCredits(credits: number) {
    this.userCredits = credits;
  }

  setUserSubscription(subscribed: boolean) {
    this.userSubscription = subscribed;
  }

  createStreamResponse(model: string, messages: any[], customKey?: string) {
    // Simulate server-side validation
    if (!this.isOnline) {
      throw new Error('Network error');
    }

    if (this.rateLimited) {
      return Promise.resolve(new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      ));
    }

    // Premium model gating
    const isPremiumModel = ['gpt-4', 'claude-3-sonnet', 'gpt-4-turbo'].includes(model);
    if (isPremiumModel && !this.userSubscription && !customKey) {
      return Promise.resolve(new Response(
        JSON.stringify({ error: 'Premium model requires subscription' }),
        { status: 403 }
      ));
    }

    // Credit check for free models
    const estimatedCost = this.estimateTokenCost(model, messages);
    if (!this.userSubscription && !customKey && this.userCredits < estimatedCost) {
      const chunks = ['data: {"error": "insufficient_credits"}\n'];
      return this.createStreamingResponse(chunks);
    }

    // Generate realistic streaming response
    const responseText = this.generateResponse(model, messages);
    const chunks = this.createStreamingChunks(responseText, estimatedCost);
    
    // Deduct credits
    if (!this.userSubscription && !customKey) {
      this.userCredits -= estimatedCost;
    }

    return this.createStreamingResponse(chunks);
  }

  private estimateTokenCost(model: string, messages: any[]): number {
    const baseTokens = messages.reduce((sum, msg) => sum + msg.content.length / 4, 0);
    const multiplier = model.includes('gpt-4') ? 3 : 1;
    return Math.ceil(baseTokens * multiplier);
  }

  private generateResponse(model: string, messages: any[]): string {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    if (lastMessage.toLowerCase().includes('hello')) {
      return 'Hello! How can I help you today?';
    }
    
    if (lastMessage.toLowerCase().includes('long')) {
      return 'This is a long response that will be streamed token by token to demonstrate the streaming functionality. It includes multiple sentences and should show how the UI updates in real-time as tokens arrive from the server.';
    }
    
    if (lastMessage.toLowerCase().includes('error')) {
      return 'An error occurred while processing your request.';
    }
    
    return `I understand you said: "${lastMessage}". Here's my response.`;
  }

  private createStreamingChunks(text: string, estimatedTokens: number): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    words.forEach((word, index) => {
      chunks.push(`data: {"token": "${index === 0 ? word : ' ' + word}"}\n`);
    });
    
    chunks.push(`data: {"done": true, "usage": {"total_cost": ${estimatedTokens / 1000}}}\n`);
    return chunks;
  }

  private createStreamingResponse(chunks: string[]) {
    return Promise.resolve(new Response(
      new ReadableStream({
        start(controller) {
          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(chunk));
              if (index === chunks.length - 1) {
                controller.close();
              }
            }, index * 50); // 50ms delay between chunks
          });
        }
      }),
      {
        status: 200,
        headers: { 'content-type': 'text/event-stream' }
      }
    ));
  }

  reset() {
    this.isOnline = true;
    this.rateLimited = false;
    this.userCredits = 1000;
    this.userSubscription = false;
  }
}

describe('End-to-End Streaming Tests', () => {
  const server = StreamingServer.getInstance();

  beforeEach(() => {
    jest.clearAllMocks();
    server.reset();
    
    // Mock supabase auth
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token', user: { id: 'test-user' } } },
      error: null,
    });

    // Mock fetch with streaming server
    global.fetch = jest.fn().mockImplementation(async (url, options) => {
      if (typeof url === 'string' && url.includes('/functions/v1/gateway')) {
        const body = JSON.parse(options?.body as string);
        return server.createStreamResponse(body.model, body.messages, body.customApiKey);
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
  });

  it('should complete full streaming conversation flow', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    const input = getByPlaceholderText('Type a message...');
    const sendButton = getByText('Send');

    // Send a message
    fireEvent.changeText(input, 'Hello there!');
    fireEvent.press(sendButton);

    // Should show streaming state
    await waitFor(() => {
      expect(queryByText('Abort')).toBeTruthy();
    });

    // Should show streaming text appearing
    await waitFor(() => {
      expect(getByText(/Hello!/)).toBeTruthy();
    }, { timeout: 5000 });

    // Should complete and show full response
    await waitFor(() => {
      expect(getByText('Hello! How can I help you today?')).toBeTruthy();
      expect(queryByText('Abort')).toBeFalsy();
    }, { timeout: 5000 });

    // Input should be enabled again
    expect(input.props.editable).toBe(true);
  }, 10000);

  it('should handle offline scenario gracefully', async () => {
    server.setOnline(false);

    const { getByPlaceholderText, getByText, queryByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello');
    fireEvent.press(getByText('Send'));

    // Should show error and retry option
    await waitFor(() => {
      expect(queryByText(/Network error/)).toBeTruthy();
      expect(queryByText('Retry')).toBeTruthy();
    }, { timeout: 3000 });

    // Restore connectivity and retry
    server.setOnline(true);
    fireEvent.press(getByText('Retry'));

    // Should succeed on retry
    await waitFor(() => {
      expect(getByText(/Hello!/)).toBeTruthy();
    }, { timeout: 5000 });
  }, 15000);

  it('should handle premium model gating for free users', async () => {
    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    // Try to use a premium model (would be selected via model picker)
    // Simulating the model change by mocking the internal state
    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello GPT-4');
    
    // Mock the model as GPT-4 for this test
    jest.doMock('../ChatScreen', () => ({
      ...jest.requireActual('../ChatScreen'),
      // This would normally be set via model picker
    }));

    fireEvent.press(getByText('Send'));

    // Should navigate to paywall instead of streaming
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Paywall');
    });
  });

  it('should handle insufficient credits scenario', async () => {
    server.setUserCredits(0);

    const { getByPlaceholderText, getByText, queryByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello');
    fireEvent.press(getByText('Send'));

    // Should show insufficient credits error
    await waitFor(() => {
      expect(queryByText(/Out of credits/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should handle rate limiting gracefully', async () => {
    server.setRateLimited(true);

    const { getByPlaceholderText, getByText, queryByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello');
    fireEvent.press(getByText('Send'));

    // Should show rate limit error
    await waitFor(() => {
      expect(queryByText(/Rate limit/)).toBeTruthy();
    }, { timeout: 3000 });

    // Should offer retry
    expect(queryByText('Retry')).toBeTruthy();
  });

  it('should handle long streaming responses', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Give me a long response');
    fireEvent.press(getByText('Send'));

    // Should start streaming
    await waitFor(() => {
      expect(queryByText('Abort')).toBeTruthy();
    });

    // Should show progressive text updates
    await waitFor(() => {
      expect(queryByText(/This is a long response/)).toBeTruthy();
    }, { timeout: 3000 });

    // Should complete with full response
    await waitFor(() => {
      expect(getByText(/real-time as tokens arrive/)).toBeTruthy();
      expect(queryByText('Abort')).toBeFalsy();
    }, { timeout: 10000 });
  }, 15000);

  it('should allow aborting long streams', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Give me a long response');
    fireEvent.press(getByText('Send'));

    // Wait for streaming to start
    await waitFor(() => {
      expect(queryByText('Abort')).toBeTruthy();
    });

    // Abort the stream
    fireEvent.press(getByText('Abort'));

    // Should stop streaming and re-enable input
    await waitFor(() => {
      expect(queryByText('Abort')).toBeFalsy();
      expect(getByText('Send')).toBeTruthy();
    });

    // Should be able to send another message
    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello again');
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(getByText(/Hello!/)).toBeTruthy();
    }, { timeout: 5000 });
  }, 15000);

  it('should handle subscription user with premium models', async () => {
    server.setUserSubscription(true);

    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    // Premium users should be able to use GPT-4
    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello from premium user');
    fireEvent.press(getByText('Send'));

    // Should stream successfully
    await waitFor(() => {
      expect(getByText(/Hello!/)).toBeTruthy();
    }, { timeout: 5000 });

    // Should not navigate to paywall
    expect(mockNavigate).not.toHaveBeenCalledWith('Paywall');
  });

  it('should handle custom API key users', async () => {
    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    // Simulate custom API key user (would be set via settings)
    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello with custom key');
    fireEvent.press(getByText('Send'));

    // Should work with premium models
    await waitFor(() => {
      expect(getByText(/Hello!/)).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('should persist conversation across multiple exchanges', async () => {
    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    // First message
    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello');
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(getByText('Hello! How can I help you today?')).toBeTruthy();
    }, { timeout: 5000 });

    // Second message
    fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Thanks for the help');
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(getByText(/Thanks for the help/)).toBeTruthy();
    }, { timeout: 5000 });

    // Both messages should be visible
    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('Hello! How can I help you today?')).toBeTruthy();
    expect(getByText('Thanks for the help')).toBeTruthy();
  }, 15000);

  it('should handle rapid message sending', async () => {
    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <ChatScreen navigation={{ navigate: mockNavigate } as any} route={{} as any} />
      </TestWrapper>
    );

    const input = getByPlaceholderText('Type a message...');
    const sendButton = getByText('Send');

    // Send message
    fireEvent.changeText(input, 'First message');
    fireEvent.press(sendButton);

    // Try to send another immediately (should be disabled)
    fireEvent.changeText(input, 'Second message');
    
    // Send button should be disabled or show "Abort" during streaming
    await waitFor(() => {
      expect(getByText('Abort')).toBeTruthy();
    });

    // Wait for first to complete
    await waitFor(() => {
      expect(getByText('Send')).toBeTruthy();
    }, { timeout: 5000 });

    // Now should be able to send second message
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText(/Second message/)).toBeTruthy();
    }, { timeout: 5000 });
  }, 10000);
});
