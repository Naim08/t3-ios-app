/**
 * Gateway Edge Function Tests
 * 
 * Integration tests for the streaming gateway with LangChain providers,
 * token spending, model gating, and error handling.
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock environment variables
const mockEnv = {
  get: (key: string) => {
    const values: Record<string, string> = {
      'SUPABASE_URL': 'https://test.supabase.co',
      'SUPABASE_ANON_KEY': 'test-anon-key',
      'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key',
      'OPENAI_API_KEY': 'test-openai-key',
      'ANTHROPIC_API_KEY': 'test-anthropic-key',
      'GOOGLE_API_KEY': 'test-google-key',
    };
    return values[key] || '';
  },
};

// Replace global Deno.env with mock
Object.defineProperty(globalThis, 'Deno', {
  value: { env: mockEnv },
  writable: true,
});

// Mock fetch for external API calls
const originalFetch = globalThis.fetch;
const mockFetch = (url: string | URL, options?: RequestInit): Promise<Response> => {
  const urlString = typeof url === 'string' ? url : url.toString();
  
  // Mock Supabase auth
  if (urlString.includes('/auth/v1/user')) {
    return Promise.resolve(new Response(JSON.stringify({
      id: 'test-user-id',
      user_metadata: {
        subscription_status: 'active',
        custom_api_key: null,
      }
    }), { status: 200 }));
  }
  
  // Mock token spending
  if (urlString.includes('/functions/v1/spend_tokens')) {
    return Promise.resolve(new Response(JSON.stringify({
      remaining: 1000,
    }), { status: 200 }));
  }
  
  // Mock credits check
  if (urlString.includes('/rest/v1/rpc/get_user_credits')) {
    return Promise.resolve(new Response(JSON.stringify({
      credits: 1000,
    }), { status: 200 }));
  }
  
  // Mock OpenAI API
  if (urlString.includes('api.openai.com')) {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":2}}\n\n',
      'data: [DONE]\n\n',
    ];
    
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach(chunk => {
          controller.enqueue(new TextEncoder().encode(chunk));
        });
        controller.close();
      }
    });
    
    return Promise.resolve(new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' }
    }));
  }
  
  // Mock Anthropic API
  if (urlString.includes('api.anthropic.com')) {
    const chunks = [
      'data: {"type":"content_block_delta","delta":{"text":"Hi"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"text":" there"}}\n\n',
      'data: {"type":"message_delta","usage":{"input_tokens":8,"output_tokens":2}}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ];
    
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach(chunk => {
          controller.enqueue(new TextEncoder().encode(chunk));
        });
        controller.close();
      }
    });
    
    return Promise.resolve(new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' }
    }));
  }
  
  // Mock Google API
  if (urlString.includes('generativelanguage.googleapis.com')) {
    const chunks = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Google"}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":" response"}]}}]}\n\n',
      'data: {"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":2}}\n\n',
    ];
    
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach(chunk => {
          controller.enqueue(new TextEncoder().encode(chunk));
        });
        controller.close();
      }
    });
    
    return Promise.resolve(new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' }
    }));
  }
  
  return originalFetch(url, options);
};

globalThis.fetch = mockFetch;

Deno.test("Gateway Edge Function", async (t) => {
  await t.step("should handle CORS preflight", async () => {
    const request = new Request('https://test.com', {
      method: 'OPTIONS',
    });

    // Import and test the gateway function
    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 200);
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  });

  await t.step("should reject unauthorized requests", async () => {
    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 401);
    const data = await response.json();
    assertExists(data.error);
  });

  await t.step("should stream OpenAI responses", async () => {
    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 200);
    assertEquals(response.headers.get('content-type'), 'text/event-stream');

    const reader = response.body?.getReader();
    assertExists(reader);

    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }

    const fullResponse = chunks.join('');
    assert(fullResponse.includes('data: {"token":"Hello"}'));
    assert(fullResponse.includes('data: {"token":" world"}'));
    assert(fullResponse.includes('data: {"done":true'));
  });

  await t.step("should handle premium model gating for free users", async () => {
    // Mock as free user (no subscription)
    globalThis.fetch = (url: string | URL, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString.includes('/auth/v1/user')) {
        return Promise.resolve(new Response(JSON.stringify({
          id: 'test-user-id',
          user_metadata: {
            subscription_status: null, // Free user
            custom_api_key: null,
          }
        }), { status: 200 }));
      }
      
      return mockFetch(url, options);
    };

    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4', // Premium model
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 403);
    const data = await response.json();
    assertEquals(data.error, 'Premium model requires subscription');

    // Reset fetch mock
    globalThis.fetch = mockFetch;
  });

  await t.step("should allow premium models for subscribers", async () => {
    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4', // Premium model
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    // Should proceed to streaming (not blocked by premium gating)
    assertEquals(response.status, 200);
    assertEquals(response.headers.get('content-type'), 'text/event-stream');
  });

  await t.step("should handle insufficient credits", async () => {
    // Mock insufficient credits response
    globalThis.fetch = (url: string | URL, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString.includes('/rest/v1/rpc/get_user_credits')) {
        return Promise.resolve(new Response(JSON.stringify({
          credits: 0, // No credits
        }), { status: 200 }));
      }
      
      return mockFetch(url, options);
    };

    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5', // Free model but requires credits
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    // Should stream an error
    assertEquals(response.status, 200);
    
    const reader = response.body?.getReader();
    assertExists(reader);

    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);
    assert(chunk.includes('insufficient_credits'));

    // Reset fetch mock
    globalThis.fetch = mockFetch;
  });

  await t.step("should calculate and spend tokens during streaming", async () => {
    let tokensSpent = 0;
    
    // Mock token spending to track calls
    globalThis.fetch = (url: string | URL, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString.includes('/functions/v1/spend_tokens')) {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        tokensSpent += body.amount || 0;
        return Promise.resolve(new Response(JSON.stringify({
          remaining: 1000 - tokensSpent,
        }), { status: 200 }));
      }
      
      return mockFetch(url, options);
    };

    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 200);

    // Read the full response to trigger token spending
    const reader = response.body?.getReader();
    assertExists(reader);

    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    // Should have spent tokens for the response
    assert(tokensSpent > 0);

    // Reset fetch mock
    globalThis.fetch = mockFetch;
  });

  await t.step("should handle custom API keys", async () => {
    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        customApiKey: 'user-provided-key',
        hasCustomKey: true,
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    // Should allow premium model with custom key
    assertEquals(response.status, 200);
    assertEquals(response.headers.get('content-type'), 'text/event-stream');
  });

  await t.step("should handle Anthropic model streaming", async () => {
    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 200);
    assertEquals(response.headers.get('content-type'), 'text/event-stream');

    const reader = response.body?.getReader();
    assertExists(reader);

    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }

    const fullResponse = chunks.join('');
    assert(fullResponse.includes('data: {"token":"Hi"}'));
    assert(fullResponse.includes('data: {"token":" there"}'));
  });

  await t.step("should handle Google model streaming", async () => {
    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-pro',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 200);
    assertEquals(response.headers.get('content-type'), 'text/event-stream');

    const reader = response.body?.getReader();
    assertExists(reader);

    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }

    const fullResponse = chunks.join('');
    assert(fullResponse.includes('data: {"token":"Google"}'));
    assert(fullResponse.includes('data: {"token":" response"}'));
  });

  await t.step("should handle provider errors gracefully", async () => {
    // Mock OpenAI API error
    globalThis.fetch = (url: string | URL, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString.includes('api.openai.com')) {
        return Promise.resolve(new Response(JSON.stringify({
          error: { message: 'Rate limit exceeded' }
        }), { status: 429 }));
      }
      
      return mockFetch(url, options);
    };

    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 200);
    
    const reader = response.body?.getReader();
    assertExists(reader);

    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);
    assert(chunk.includes('error'));

    // Reset fetch mock
    globalThis.fetch = mockFetch;
  });

  await t.step("should validate request format", async () => {
    const request = new Request('https://test.com', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required fields
        model: 'gpt-3.5',
        // messages missing
      }),
    });

    const { default: gateway } = await import('../index.ts');
    const response = await gateway(request);

    assertEquals(response.status, 400);
    const data = await response.json();
    assertExists(data.error);
  });
});
