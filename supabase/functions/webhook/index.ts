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
      console.error('❌ JWT verification failed - invalid signature or payload');
      return new Response('Invalid JWT signature', { status: 401 });
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
      console.error('❌ Failed to verify transaction info JWT');
      return new Response('Invalid transaction JWT', { status: 401 });
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

// Apple's JWKS keys for JWT verification
const APPLE_JWKS = {
  "keys": [
    {
      "kty": "RSA",
      "kid": "rs0M3kOV9p",
      "use": "sig",
      "alg": "RS256",
      "n": "zH5so3zLsgmRypxAAYJimfF9cx3ISSyHyzjDP3yvE9ieqpnjFJhzgCP8L4oKO9vUFNpoG1ub7I3paYNY6Vb2yc4chnsjJxB3j0jomJ3iI9MlWoVecTFG2tywyx5NRhy3YfTUpw2uCLafzWrpIJIoKUCGM6iUgaIFjvfi-cGT5T_5eUSWZHN-ziH69mGcbMRGLQEixQUatwru9i4i-OSk-w-JmLOqAzRP1mVn1tcZRIoGSB2PFSSJX9SK90OX8i5sj7dpIO_2xbGMtyNJkDzGq88x1pMJ4sv6HMj-tx4QrpGDbUi7zBCgbBnNSGSB_LBv4dbswwWY96ckHgx9yf_7IQ",
      "e": "AQAB"
    },
    {
      "kty": "RSA",
      "kid": "E6q83RB15n",
      "use": "sig",
      "alg": "RS256",
      "n": "qD2kjZNSBESRVJksHHnDpMPprhCymecPO8Ji6xlY_fGdUOioVf0nckGaiBwjPGo3xKadAGvbNJ1BjCZOmbLL7lQ5mT8fI6l5HaY8txcz3_PjOUHdiXBuThmQ2eEXtmOtRxi3LNnXaOCpl7QxHgyiPTVgJpJ18Teqz2ESVXg_Lpmw7ot3zBI0p9E56-HVZwxpwS8EoN53nx850fxAlpZj5d1szgV8YzhcRG-8FMOialu-me0OFZWghB-_jCMfdBhWHMWpGkfLPDA1o8eLkr0UByZwMHKCWA--JUvlKvSv3xavDD7ILj8t5PiItonVV9telbza-ToaOWMiG5gZ5QfWDQ",
      "e": "AQAB"
    },
    {
      "kty": "RSA",
      "kid": "Sf2lFqwkpX",
      "use": "sig",
      "alg": "RS256",
      "n": "oNe3ZKHU5-fnmbjhCamUpBSyLkR4jbQy-PCZU4cr7tyPcFokyZ1CjSGm44sw3EPONWO6bWgKZYBX2UPv7UM3GBIuB8qBkkN0_vu0Kdr8KUWJ-6m9fnKgceDil4K4TsSS8Owe9qnP9XjjmVRK7cCEjew4GYqQ7gRcHUjIQ-PrKkNBOOijxLlwckeQK2IN9WS_CBXVMleXLutfYAHpwr2KoAmt5BQvPFqBegozHaTc2UvarcUPKMrl-sjY_AXobH7NjqfbBLRJLzS2EzE4y865QiBpwwdhlK4ZQ3g1DCV57BDKvoBX0guCDNSFvoPuIjMmTxZEUbwrJ1CQ4Ib5j4VCkQ",
      "e": "AQAB"
    }
  ]
};

async function verifyAndDecodeJWT(signedPayload: string): Promise<AppleJWTPayload | null> {
  try {
    console.log('🔐 Starting JWT verification with Apple JWKS...');
    
    const [headerB64, payloadB64, signatureB64] = signedPayload.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      console.error('❌ Invalid JWT format');
      return null;
    }

    // Decode header to get the key ID
    const header = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')),
          c => c.charCodeAt(0)
        )
      )
    );

    console.log(`🔑 JWT Key ID: ${header.kid}`);

    // Find the matching key in JWKS
    const jwk = APPLE_JWKS.keys.find(key => key.kid === header.kid);
    if (!jwk) {
      console.error(`❌ No matching key found for kid: ${header.kid}`);
      return null;
    }

    console.log('✅ Found matching JWKS key');

    // Verify the JWT signature using the public key
    const isValid = await verifyJWTSignature(signedPayload, jwk);
    if (!isValid) {
      console.error('❌ JWT signature verification failed');
      return null;
    }

    console.log('✅ JWT signature verified successfully');

    // Decode payload
    const decodedPayload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')),
          c => c.charCodeAt(0)
        )
      )
    );

    return decodedPayload as AppleJWTPayload;
  } catch (error) {
    console.error('❌ Failed to verify and decode JWT:', error);
    return null;
  }
}

async function verifyJWTSignature(jwt: string, jwk: any): Promise<boolean> {
  try {
    // Convert JWK to CryptoKey
    const publicKey = await importJWKToCryptoKey(jwk);
    
    // Split JWT
    const [headerB64, payloadB64, signatureB64] = jwt.split('.');
    
    // Create the signed data (header + payload)
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    
    // Decode signature from base64url
    const signature = base64urlToArrayBuffer(signatureB64);
    
    // Verify signature
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      signedData
    );
    
    return isValid;
  } catch (error) {
    console.error('❌ Error verifying JWT signature:', error);
    return false;
  }
}

async function importJWKToCryptoKey(jwk: any): Promise<CryptoKey> {
  const keyData = {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e,
    alg: jwk.alg,
    use: jwk.use
  };
  
  return await crypto.subtle.importKey(
    'jwk',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['verify']
  );
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function decodeJWTToken(token: string): Promise<AppleTransactionInfo | null> {
  try {
    console.log('🔐 Verifying transaction JWT...');
    
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      console.error('❌ Invalid transaction JWT format');
      return null;
    }

    // Decode header to get the key ID
    const header = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')),
          c => c.charCodeAt(0)
        )
      )
    );

    // Find the matching key in JWKS
    const jwk = APPLE_JWKS.keys.find(key => key.kid === header.kid);
    if (!jwk) {
      console.error(`❌ No matching key found for transaction JWT kid: ${header.kid}`);
      return null;
    }

    // Verify the JWT signature
    const isValid = await verifyJWTSignature(token, jwk);
    if (!isValid) {
      console.error('❌ Transaction JWT signature verification failed');
      return null;
    }

    console.log('✅ Transaction JWT signature verified');

    // Decode payload
    const decodedPayload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')),
          c => c.charCodeAt(0)
        )
      )
    );

    return decodedPayload as AppleTransactionInfo;
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