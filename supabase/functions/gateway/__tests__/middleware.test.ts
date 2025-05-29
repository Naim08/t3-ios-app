/**
 * Token Spending Middleware Tests
 * 
 * Tests for the enhanced middleware that handles streaming cost accumulation
 * and proper token spending based on actual API costs.
 */

import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { TokenSpendingMiddleware } from "../middleware.js";

// Mock fetch for the tests
let mockFetchCalls: Array<{ url: string; options: RequestInit }> = [];
let mockFetchResponse: Response = new Response(JSON.stringify({ remaining: 1000 }), { status: 200 });

const mockFetch = (url: string | URL, options?: RequestInit): Promise<Response> => {
  mockFetchCalls.push({ 
    url: typeof url === 'string' ? url : url.toString(), 
    options: options || {} 
  });
  return Promise.resolve(mockFetchResponse);
};

Deno.test("TokenSpendingMiddleware", async (t) => {
  const originalFetch = globalThis.fetch;
  
  // Setup
  beforeEach(() => {
    mockFetchCalls = [];
    globalThis.fetch = mockFetch;
    mockFetchResponse = new Response(JSON.stringify({ remaining: 1000 }), { status: 200 });
  });
  
  // Cleanup
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.step("should initialize with model and prompt tokens", () => {
    const middleware = new TokenSpendingMiddleware(
      'user-123', 
      'https://test.supabase.co', 
      'token', 
      'gpt-3.5-turbo', 
      100
    );
    
    // Should not throw and should be ready to accumulate text
    assertEquals(typeof middleware.accumulateText, 'function');
    assertEquals(typeof middleware.finalize, 'function');
  });

  await t.step("should accumulate text and calculate conservative estimates", async () => {
    const middleware = new TokenSpendingMiddleware(
      'user-123', 
      'https://test.supabase.co', 
      'token', 
      'gpt-3.5-turbo', 
      100
    );
    
    // Add small amounts of text - should not trigger immediate spending
    await middleware.accumulateText('Hello');
    await middleware.accumulateText(' world');
    
    // Should not have made any API calls yet (below threshold)
    assertEquals(mockFetchCalls.length, 0);
  });

  await t.step("should batch spend when threshold is reached", async () => {
    const middleware = new TokenSpendingMiddleware(
      'user-123', 
      'https://test.supabase.co', 
      'token', 
      'gpt-3.5-turbo', 
      100
    );
    
    // Add enough text to trigger spending (threshold is 5 credits)
    const longText = 'a'.repeat(5000); // Should accumulate 5+ credits worth
    await middleware.accumulateText(longText);
    
    // Should have made an API call
    assertEquals(mockFetchCalls.length, 1);
    assertEquals(mockFetchCalls[0].url, 'https://test.supabase.co/functions/v1/spend_tokens');
    
    const body = JSON.parse(mockFetchCalls[0].options.body as string);
    assertEquals(typeof body.amount, 'number');
    assertEquals(body.amount > 0, true);
  });

  await t.step("should handle insufficient credits error", async () => {
    mockFetchResponse = new Response('Insufficient credits', { status: 402 });
    
    const middleware = new TokenSpendingMiddleware(
      'user-123', 
      'https://test.supabase.co', 
      'token', 
      'gpt-3.5-turbo', 
      100
    );
    
    const longText = 'a'.repeat(5000);
    
    await assertRejects(
      () => middleware.accumulateText(longText),
      Error,
      'insufficient_credits'
    );
  });

  await t.step("should calculate final accurate cost on finalize", async () => {
    const middleware = new TokenSpendingMiddleware(
      'user-123', 
      'https://test.supabase.co', 
      'token', 
      'gpt-3.5-turbo', 
      100
    );
    
    // Accumulate text without triggering threshold
    await middleware.accumulateText('Hello world, this is a test response.');
    
    // Finalize should calculate accurate cost and spend
    await middleware.finalize();
    
    // Should have made an API call for final spending
    assertEquals(mockFetchCalls.length, 1);
    
    const body = JSON.parse(mockFetchCalls[0].options.body as string);
    assertEquals(body.amount > 0, true);
  });

  await t.step("should support legacy accumulateTokens method", async () => {
    const middleware = new TokenSpendingMiddleware(
      'user-123', 
      'https://test.supabase.co', 
      'token', 
      'gpt-3.5-turbo', 
      100
    );
    
    // Should work with old interface
    await middleware.accumulateTokens(10);
    
    // Should trigger spending when threshold reached
    assertEquals(mockFetchCalls.length, 1);
  });

  await t.step("should handle network errors gracefully", async () => {
    mockFetchResponse = new Response('Server error', { status: 500 });
    
    const middleware = new TokenSpendingMiddleware(
      'user-123', 
      'https://test.supabase.co', 
      'token', 
      'gpt-3.5-turbo', 
      100
    );
    
    // Should retry spending on network errors (not insufficient credits)
    await assertRejects(
      () => middleware.accumulateTokens(10),
      Error
    );
  });

  await t.step("should use different cost thresholds appropriately", async () => {
    const middleware = new TokenSpendingMiddleware(
      'user-123', 
      'https://test.supabase.co', 
      'token', 
      'gpt-4', // More expensive model
      100
    );
    
    // Smaller amount of text should still trigger spending for expensive models
    await middleware.accumulateTokens(5); // Exactly at threshold
    
    assertEquals(mockFetchCalls.length, 1);
  });
});

// Helper functions for setup/teardown
function beforeEach(fn: () => void) {
  fn();
}

function afterEach(fn: () => void) {
  // In a real test framework, this would be called after each test
  // For now, we'll call it manually where needed
}
