/**
 * Edge Functions Integration Tests
 * 
 * These tests require the Supabase local development environment to be running.
 * Run: `supabase start` before running these tests.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeo-f_M8Cj_xtgX1i_EuKnABkUMnPCzj0n0';

describe('Credits Edge Functions', () => {
  let supabase: any;
  let testUserId: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Create a test user
    const { data, error } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    
    if (error) throw error;
    testUserId = data.user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      // Clean up test user
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('should get initial credits for new user', async () => {
    const { data, error } = await supabase.functions.invoke('get_credits');
    
    expect(error).toBeNull();
    expect(data.remaining).toBe(150000); // 150K tokens seeded by trigger
  });

  it('should spend tokens atomically', async () => {
    // First, ensure we have credits
    const { data: initialData } = await supabase.functions.invoke('get_credits');
    expect(initialData.remaining).toBeGreaterThan(1000);

    // Spend some tokens
    const { data, error } = await supabase.functions.invoke('spend_tokens', {
      body: { amount: 500 }
    });

    expect(error).toBeNull();
    expect(data.remaining).toBe(initialData.remaining - 500);
  });

  it('should reject spend when insufficient credits', async () => {
    // Try to spend more than available
    const { data: initialData } = await supabase.functions.invoke('get_credits');
    
    const { data, error } = await supabase.functions.invoke('spend_tokens', {
      body: { amount: initialData.remaining + 1000 }
    });

    expect(error).toBeTruthy();
    expect(error.message).toContain('insufficient_credits');
  });

  it('should handle concurrent spends correctly (race condition test)', async () => {
    // First, add some tokens to ensure we have enough for the test
    await supabase.functions.invoke('add_tokens', {
      body: { amount: 2000 }
    });

    const { data: initialData } = await supabase.functions.invoke('get_credits');
    const initialBalance = initialData.remaining;

    // Perform concurrent spends
    const spend1Promise = supabase.functions.invoke('spend_tokens', {
      body: { amount: 300 }
    });
    const spend2Promise = supabase.functions.invoke('spend_tokens', {
      body: { amount: 200 }
    });

    const [result1, result2] = await Promise.all([spend1Promise, spend2Promise]);

    // Both should succeed or one should fail with insufficient credits
    if (!result1.error && !result2.error) {
      // If both succeed, the final balance should be correct
      const { data: finalData } = await supabase.functions.invoke('get_credits');
      expect(finalData.remaining).toBe(initialBalance - 500);
    } else {
      // If one fails, it should be due to insufficient credits
      const failedResult = result1.error ? result1 : result2;
      const successResult = result1.error ? result2 : result1;
      
      expect(failedResult.error.message).toContain('insufficient_credits');
      expect(successResult.error).toBeNull();
    }
  });

  it('should add tokens correctly', async () => {
    const { data: initialData } = await supabase.functions.invoke('get_credits');
    const initialBalance = initialData.remaining;

    const { data, error } = await supabase.functions.invoke('add_tokens', {
      body: { amount: 1000 }
    });

    expect(error).toBeNull();
    expect(data.remaining).toBe(initialBalance + 1000);
  });
});
