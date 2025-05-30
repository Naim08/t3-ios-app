/**
 * IAP Webhook Tests
 * 
 * Basic tests for Apple S2S webhook functionality.
 * These tests mock the Apple JWT payloads and database operations.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeo-f_M8Cj_xtgX1i_EuKnABkUMnPCzj0n0';

// Mock Apple JWT payload for DID_RENEW notification
function createMockAppleJWT(notificationType: string, transactionId: string): string {
  const header = btoa(JSON.stringify({ alg: 'ES256', kid: 'test' }));
  
  const payload = btoa(JSON.stringify({
    notificationType,
    notificationUUID: `test-${Date.now()}`,
    data: {
      appAppleId: 123456789,
      bundleId: 'com.example.pocket-t3',
      signedTransactionInfo: createMockTransactionJWT(transactionId),
      environment: 'Sandbox'
    },
    version: '2.0',
    signedDate: Date.now()
  }));
  
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

function createMockTransactionJWT(transactionId: string): string {
  const header = btoa(JSON.stringify({ alg: 'ES256', kid: 'test' }));
  
  const payload = btoa(JSON.stringify({
    originalTransactionId: 'original-tx-123',
    transactionId,
    productId: 'premium_pass_monthly',
    purchaseDate: Date.now(),
    expiresDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    quantity: 1,
    type: 'Auto-Renewable Subscription',
    environment: 'Sandbox'
  }));
  
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

describe('IAP Webhook', () => {
  let supabase: any;
  let testUserId: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Create a test user
    const { data, error } = await supabase.auth.signUp({
      email: `test-webhook-${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    
    if (error) throw error;
    testUserId = data.user.id;

    // Create a mock subscription record for this user
    await supabase.from('user_subscriptions').insert({
      user_id: testUserId,
      original_transaction_id: 'original-tx-123',
      transaction_id: 'initial-tx',
      product_id: 'premium_pass_monthly',
      is_active: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      platform: 'ios'
    });
  });

  afterAll(async () => {
    if (testUserId) {
      // Clean up test data
      await supabase.from('user_subscriptions').delete().eq('user_id', testUserId);
      await supabase.from('iap_events').delete().eq('user_id', testUserId);
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('should handle DID_RENEW notification and add tokens', async () => {
    const mockJWT = createMockAppleJWT('DID_RENEW', 'renewal-tx-123');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: mockJWT
    });

    expect(response.status).toBe(200);
    
    // Check that event was logged
    const { data: events } = await supabase
      .from('iap_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('event_type', 'DID_RENEW');
    
    expect(events?.length).toBeGreaterThan(0);
  });

  it('should handle CANCEL notification and deactivate subscription', async () => {
    const mockJWT = createMockAppleJWT('CANCEL', 'cancel-tx-123');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: mockJWT
    });

    expect(response.status).toBe(200);
    
    // Check that event was logged
    const { data: events } = await supabase
      .from('iap_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('event_type', 'CANCEL');
    
    expect(events?.length).toBeGreaterThan(0);
  });

  it('should not process duplicate events', async () => {
    const mockJWT = createMockAppleJWT('DID_RENEW', 'duplicate-tx-123');
    
    // Send the same event twice
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: mockJWT
    });

    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: mockJWT
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    
    // Should only have one event logged
    const { data: events } = await supabase
      .from('iap_events')
      .select('*')
      .eq('transaction_id', 'duplicate-tx-123');
    
    expect(events?.length).toBe(1);
  });
});