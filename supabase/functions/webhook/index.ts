/* eslint-disable no-undef */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Apple S2S notification types
const NOTIFICATION_TYPES = {
  DID_RENEW: 'DID_RENEW',
  INTERACTIVE_RENEWAL: 'INTERACTIVE_RENEWAL',
  CANCEL: 'CANCEL',
  EXPIRED: 'EXPIRED',
  REFUND: 'REFUND',
  DID_CHANGE_RENEWAL_STATUS: 'DID_CHANGE_RENEWAL_STATUS',
  DID_CHANGE_RENEWAL_PREF: 'DID_CHANGE_RENEWAL_PREF',
  REVOKE: 'REVOKE',
  PRICE_INCREASE_CONSENT: 'PRICE_INCREASE_CONSENT',
} as const;

const RENEWAL_TYPES = [
  NOTIFICATION_TYPES.DID_RENEW,
  NOTIFICATION_TYPES.INTERACTIVE_RENEWAL
];

const CANCELLATION_TYPES = [
  NOTIFICATION_TYPES.CANCEL,
  NOTIFICATION_TYPES.EXPIRED,
  NOTIFICATION_TYPES.REVOKE
];

interface AppleJWTPayload {
  notificationType: string;
  notificationUUID: string;
  data: {
    appAppleId: number;
    bundleId: string;
    bundleVersion: string;
    environment: 'Sandbox' | 'Production';
    signedTransactionInfo: string;
    signedRenewalInfo?: string;
  };
  version: string;
  signedDate: number;
}

interface AppleTransactionInfo {
  originalTransactionId: string;
  transactionId: string;
  webOrderLineItemId: string;
  bundleId: string;
  productId: string;
  subscriptionGroupIdentifier: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate?: number;
  quantity: number;
  type: 'Auto-Renewable Subscription' | 'Non-Consumable' | 'Consumable';
  appAccountToken?: string;
  inAppOwnershipType: 'PURCHASED' | 'FAMILY_SHARED';
  signedDate: number;
  environment: 'Sandbox' | 'Production';
  transactionReason: 'PURCHASE' | 'RENEWAL';
  storefront: string;
  storefrontId: string;
  price: number;
  currency: string;
}

interface AppleRenewalInfo {
  autoRenewProductId: string;
  autoRenewStatus: number;
  environment: 'Sandbox' | 'Production';
  expirationIntent?: number;
  gracePeriodExpiresDate?: number;
  isInBillingRetryPeriod?: boolean;
  offerIdentifier?: string;
  offerType?: number;
  originalTransactionId: string;
  priceIncreaseStatus?: number;
  productId: string;
  recentSubscriptionStartDate: number;
  signedDate: number;
}

const SUBSCRIPTION_ID = 'premium_pass_monthly';
const MONTHLY_TOKENS = 150000;

/**
 * Simple JWT decoder without signature verification
 * WARNING: Only use for development/testing. Production should verify signatures.
 */
function decodeJWTUnsafe(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = parts[1];
    // Add padding if needed
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('❌ Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Simple function to verify and decode Apple JWT
 * For development: just decodes without verification
 * For production: should implement proper signature verification
 */
async function verifyAndDecodeJWT(signedPayload: string): Promise<AppleJWTPayload | null> {
  const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production';
  
  if (isDevelopment) {
    console.log('⚠️ DEVELOPMENT MODE: Skipping JWT signature verification');
    return decodeJWTUnsafe(signedPayload);
  } else {
    // TODO: Implement proper JWT signature verification for production
    console.log('🔒 PRODUCTION MODE: JWT verification not implemented yet');
    return decodeJWTUnsafe(signedPayload);
  }
}

/**
 * Decode Apple's signed transaction/renewal info JWTs
 */
async function decodeJWTToken(signedToken: string): Promise<any> {
  return decodeJWTUnsafe(signedToken);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    console.log('🍎 Received Apple S2S notification');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the signed payload from Apple
    const signedPayload = await req.text();
    
    if (!signedPayload) {
      console.error('❌ Empty payload received');
      return new Response('Empty payload', { status: 400 });
    }

    // Verify and decode the JWT payload
    const payload = await verifyAndDecodeJWT(signedPayload);
    if (!payload) {
      console.error('❌ Invalid JWT payload');
      return new Response('Invalid JWT', { status: 400 });
    }

    console.log(`📧 Notification type: ${payload.notificationType}`);
    console.log(`🆔 Notification UUID: ${payload.notificationUUID}`);

    // Check if we've already processed this event
    const existingEventResponse = await fetch(
      `${supabaseUrl}/rest/v1/iap_events?event_id=eq.${payload.notificationUUID}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        }
      }
    );

    const existingEvents = await existingEventResponse.json();
    if (existingEvents.length > 0) {
      console.log('✅ Event already processed, skipping');
      return new Response('Event already processed', { status: 200 });
    }

    // Decode transaction info
    const transactionInfo = await decodeJWTToken(payload.data.signedTransactionInfo);
    if (!transactionInfo) {
      console.error('❌ Failed to decode transaction info');
      return new Response('Invalid transaction info', { status: 400 });
    }

    console.log(`💳 Transaction ID: ${transactionInfo.transactionId}`);
    console.log(`📦 Product ID: ${transactionInfo.productId}`);

    // Only process subscription events for our premium product
    if (transactionInfo.productId !== SUBSCRIPTION_ID) {
      console.log(`ℹ️ Ignoring event for product: ${transactionInfo.productId}`);
      return new Response('Product not monitored', { status: 200 });
    }

    // Find user by original transaction ID
    const userId = await findUserByTransactionId(
      transactionInfo.originalTransactionId,
      supabaseUrl,
      supabaseServiceKey
    );

    if (!userId) {
      console.error('❌ User not found for transaction');
      // Still log the event to prevent reprocessing
      await logIAPEvent(
        payload.notificationUUID,
        null,
        payload.notificationType,
        transactionInfo.transactionId,
        payload,
        supabaseUrl,
        supabaseServiceKey
      );
      return new Response('User not found', { status: 200 });
    }

    console.log(`👤 Found user: ${userId}`);

    // Process the notification based on type
    let processed = false;
    
    if (RENEWAL_TYPES.includes(payload.notificationType as any)) {
      processed = await handleRenewal(
        userId,
        transactionInfo,
        supabaseUrl,
        supabaseServiceKey
      );
    } else if (CANCELLATION_TYPES.includes(payload.notificationType as any)) {
      processed = await handleCancellation(
        userId,
        transactionInfo,
        payload.notificationType,
        supabaseUrl,
        supabaseServiceKey
      );
    } else if (payload.notificationType === NOTIFICATION_TYPES.REFUND) {
      processed = await handleRefund(
        userId,
        transactionInfo,
        supabaseUrl,
        supabaseServiceKey
      );
    } else {
      console.log(`ℹ️ Unhandled notification type: ${payload.notificationType}`);
      processed = true; // Mark as processed to avoid reprocessing
    }

    // Log the event
    await logIAPEvent(
      payload.notificationUUID,
      userId,
      payload.notificationType,
      transactionInfo.transactionId,
      payload,
      supabaseUrl,
      supabaseServiceKey
    );

    if (processed) {
      // Broadcast subscription status change for real-time updates
      await broadcastSubscriptionChange(userId, supabaseUrl, supabaseServiceKey);
    }

    console.log('✅ Apple S2S notification processed successfully');
    return new Response('Success', { status: 200 });

  } catch (error) {
    console.error('❌ Error processing Apple S2S notification:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

async function verifyAndDecodeJWT(signedPayload: string): Promise<AppleJWTPayload | null> {
  try {
    // Check if we're in development mode
    const isDevelopment = Deno.env.get('SUPABASE_ENV') === 'development' || 
                         Deno.env.get('ENVIRONMENT') === 'development';

    if (isDevelopment) {
      console.log('⚠️ Development mode: Using unsafe JWT decoding');
      return decodeJWTUnsafe<AppleJWTPayload>(signedPayload);
    } else {
      console.log('🔒 Production mode: Verifying JWT signature');
      return await verifyAndDecodeAppleJWT<AppleJWTPayload>(signedPayload);
    }
  } catch (error) {
    console.error('❌ Failed to decode JWT:', error);
    return null;
  }
}

async function decodeJWTToken(token: string): Promise<AppleTransactionInfo | null> {
  try {
    // Check if we're in development mode
    const isDevelopment = Deno.env.get('SUPABASE_ENV') === 'development' || 
                         Deno.env.get('ENVIRONMENT') === 'development';

    if (isDevelopment) {
      console.log('⚠️ Development mode: Using unsafe JWT decoding for transaction');
      return decodeJWTUnsafe<AppleTransactionInfo>(token);
    } else {
      console.log('🔒 Production mode: Verifying transaction JWT signature');
      return await verifyAndDecodeAppleJWT<AppleTransactionInfo>(token);
    }
  } catch (error) {
    console.error('❌ Failed to decode transaction token:', error);
    return null;
  }
}

async function findUserByTransactionId(
  originalTransactionId: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_subscriptions?original_transaction_id=eq.${originalTransactionId}&select=user_id&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        }
      }
    );

    const subscriptions = await response.json();
    return subscriptions.length > 0 ? subscriptions[0].user_id : null;
  } catch (error) {
    console.error('❌ Error finding user:', error);
    return null;
  }
}

async function handleRenewal(
  userId: string,
  transactionInfo: AppleTransactionInfo,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<boolean> {
  try {
    console.log(`🔄 Processing renewal for user: ${userId}`);

    // Add monthly tokens using the existing add_tokens function
    const addTokensResponse = await fetch(`${supabaseUrl}/functions/v1/add_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: MONTHLY_TOKENS,
        user_id: userId
      })
    });

    if (!addTokensResponse.ok) {
      console.error('❌ Failed to add renewal tokens');
      return false;
    }

    // Update subscription expiration date
    const expiresAt = transactionInfo.expiresDate 
      ? new Date(transactionInfo.expiresDate) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days fallback

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_subscriptions?original_transaction_id=eq.${transactionInfo.originalTransactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expires_at: expiresAt.toISOString(),
          is_active: true,
          transaction_id: transactionInfo.transactionId,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      console.error('❌ Failed to update subscription');
      return false;
    }

    console.log(`✅ Renewal processed: +${MONTHLY_TOKENS} tokens`);
    return true;
  } catch (error) {
    console.error('❌ Error handling renewal:', error);
    return false;
  }
}

async function handleCancellation(
  userId: string,
  transactionInfo: AppleTransactionInfo,
  notificationType: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<boolean> {
  try {
    console.log(`❌ Processing cancellation for user: ${userId}`);

    // Update subscription to inactive
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_subscriptions?original_transaction_id=eq.${transactionInfo.originalTransactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: false,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      console.error('❌ Failed to update subscription status');
      return false;
    }

    // Update user credits to remove premium status
    const updateCreditsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_premium_subscriber: false,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateCreditsResponse.ok) {
      console.error('❌ Failed to update user credits');
      return false;
    }

    console.log(`✅ Cancellation processed for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error handling cancellation:', error);
    return false;
  }
}

async function handleRefund(
  userId: string,
  transactionInfo: AppleTransactionInfo,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<boolean> {
  try {
    console.log(`💸 Processing refund for user: ${userId}`);

    // For refunds, we'll remove premium status but leave existing tokens
    // You might want to implement more sophisticated logic here
    
    const updateCreditsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_premium_subscriber: false,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateCreditsResponse.ok) {
      console.error('❌ Failed to update user credits after refund');
      return false;
    }

    console.log(`✅ Refund processed for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error handling refund:', error);
    return false;
  }
}

async function logIAPEvent(
  eventId: string,
  userId: string | null,
  eventType: string,
  transactionId: string,
  metadata: any,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  try {
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/iap_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_id: eventId,
        user_id: userId,
        event_type: eventType,
        transaction_id: transactionId,
        metadata: metadata
      })
    });

    if (!insertResponse.ok) {
      console.error('❌ Failed to log IAP event');
    } else {
      console.log('✅ IAP event logged successfully');
    }
  } catch (error) {
    console.error('❌ Error logging IAP event:', error);
  }
}

async function broadcastSubscriptionChange(
  userId: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  try {
    // Use Supabase Realtime to broadcast subscription status change
    const broadcastResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/broadcast_subscription_change`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId
      })
    });

    if (broadcastResponse.ok) {
      console.log('📡 Subscription change broadcasted');
    } else {
      console.error('❌ Failed to broadcast subscription change');
    }
  } catch (error) {
    console.error('❌ Error broadcasting subscription change:', error);
  }
}