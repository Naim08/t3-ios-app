/* eslint-disable no-undef */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateReceiptRequest {
  receipt_data: string;
  user_id: string;
  product_id: string;
  transaction_id: string;
  platform: 'ios' | 'android';
}

interface AppleReceiptResponse {
  status: number;
  latest_receipt_info?: Array<{
    original_transaction_id: string;
    expires_date_ms: string;
    purchase_date_ms: string;
    product_id: string;
    transaction_id: string;
  }>;
  in_app?: Array<{
    original_transaction_id: string;
    purchase_date_ms: string;
    product_id: string;
    transaction_id: string;
    quantity: string;
  }>;
  receipt?: {
    in_app: Array<{
      original_transaction_id: string;
      purchase_date_ms: string;
      product_id: string;
      transaction_id: string;
      quantity: string;
    }>;
  };
  pending_renewal_info?: Array<{
    auto_renew_status: string;
    product_id: string;
  }>;
}

// Product configuration - must match your React Native app
const SUBSCRIPTION_ID = 'premium_pass_monthly';
const SUBSCRIPTION_GROUP_ID = '21693600'; // Apple Subscription Group ID
const TOKEN_PRODUCTS = {
  '25K_tokens': 25000,
  '100K_tokens': 100000,
  'tokens_250k': 250000,
  '500K_tokens': 500000,
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting receipt validation...');
    
    // Get Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      }
    });

    if (!authResponse.ok) {
      console.error('❌ Invalid or expired token');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { id: authenticatedUserId } = await authResponse.json();

    // Parse and validate request body
    const { 
      receipt_data, 
      user_id, 
      product_id, 
      transaction_id, 
      platform 
    }: ValidateReceiptRequest = await req.json();

    console.log(`📦 Processing ${platform} receipt for product: ${product_id}`);

    // Use authenticated user ID and verify match
    const userId = user_id || authenticatedUserId;
    if (user_id && user_id !== authenticatedUserId) {
      console.error('❌ User ID mismatch');
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!receipt_data || !product_id || !transaction_id || !platform) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL FIX #1: Check for existing transactions using your unique index
    console.log('🔍 Checking for existing transactions...');
    
    const existingSubResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}&transaction_id=eq.${transaction_id}`, 
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        }
      }
    );

    const existingSubs = await existingSubResponse.json();
    
    if (existingSubs.length > 0) {
      console.log('✅ Transaction already processed');
      const existing = existingSubs[0];
      return new Response(
        JSON.stringify({ 
          success: true,
          alreadyProcessed: true,
          isActive: existing.is_active,
          expiresAt: existing.expires_at,
          productId: existing.product_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL FIX #2: Validate receipt based on platform
    let validationResult;
    
    if (platform === 'ios') {
      validationResult = await validateAppleReceipt(receipt_data, transaction_id, product_id);
    } else if (platform === 'android') {
      validationResult = await validateGooglePlayReceipt(receipt_data, product_id);
    } else {
      console.error('❌ Unsupported platform:', platform);
      return new Response(
        JSON.stringify({ error: 'Unsupported platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validationResult.success) {
      console.error('❌ Receipt validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Receipt validation successful');

    // CRITICAL FIX #3: Determine purchase type and handle accordingly
    const isSubscription = product_id === SUBSCRIPTION_ID;
    const isTokenPurchase = TOKEN_PRODUCTS[product_id as keyof typeof TOKEN_PRODUCTS];
    
    let tokensAdded = 0;
    let expiresAt: Date | null = null;
    let isActive = true;

    if (isSubscription) {
      // Handle subscription
      expiresAt = validationResult.expiresAt!;
      isActive = expiresAt > new Date();
      console.log(`📅 Subscription expires: ${expiresAt.toISOString()}, Active: ${isActive}`);
    } else if (isTokenPurchase) {
      // Handle token purchase - tokens don't expire, but we can set a far future date
      expiresAt = new Date('2099-12-31T23:59:59.999Z');
      console.log(`🪙 Token purchase: ${TOKEN_PRODUCTS[product_id as keyof typeof TOKEN_PRODUCTS]} tokens`);
    } else {
      console.error('❌ Unknown product ID:', product_id);
      return new Response(
        JSON.stringify({ error: 'Unknown product ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL FIX #4: Insert into user_subscriptions table (works for both subscriptions and tokens)
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        transaction_id: transaction_id,
        original_transaction_id: validationResult.originalTransactionId || transaction_id,
        latest_receipt: receipt_data,
        expires_at: expiresAt.toISOString(),
        purchase_date_ms: validationResult.purchaseDateMs,
        is_active: isActive,
        product_id: product_id,
        platform: platform
      })
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('❌ Failed to insert subscription/purchase:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to record purchase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL FIX #5: Add tokens and update user_credits table
    if (isActive) {
      if (isSubscription) {
        // Premium subscription: 150K tokens + premium status
        tokensAdded = await updateUserCredits(userId, 150000, true, supabaseUrl, supabaseServiceKey);
      } else if (isTokenPurchase) {
        // Token purchase: specific amount
        const tokenAmount = TOKEN_PRODUCTS[product_id as keyof typeof TOKEN_PRODUCTS];
        tokensAdded = await updateUserCredits(userId, tokenAmount, false, supabaseUrl, supabaseServiceKey);
      }
    }

    console.log(`✅ Purchase processed successfully, tokens added: ${tokensAdded}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        isActive,
        expiresAt: expiresAt?.toISOString() || null,
        tokensAdded,
        platform,
        isSubscription,
        productId: product_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// CRITICAL FIX #6: Improved Apple receipt validation
async function validateAppleReceipt(receipt: string, transactionId: string, productId: string): Promise<{
  success: boolean;
  error?: string;
  expiresAt?: Date;
  purchaseDateMs?: number;
  originalTransactionId?: string;
}> {
  const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
  const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
  
  const receiptData = {
    'receipt-data': receipt,
    'password': Deno.env.get('APPLE_IAP_SHARED_SECRET') || '',
    'exclude-old-transactions': false
  };

  console.log('🍎 Validating Apple receipt...');

  try {
    // Try production first
    let response = await fetch(productionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiptData)
    });

    let result: AppleReceiptResponse = await response.json();
    
    // Status 21007 means receipt is from sandbox - retry with sandbox
    if (result.status === 21007) {
      console.log('🔄 Receipt from sandbox, retrying with sandbox URL...');
      response = await fetch(sandboxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptData)
      });
      result = await response.json();
    }

    if (result.status !== 0) {
      console.error(`❌ Apple validation failed with status: ${result.status}`);
      return { success: false, error: `Apple validation failed with status: ${result.status}` };
    }

    // CRITICAL FIX #7: Handle both subscriptions and one-time purchases
    let receiptInfo;
    
    // For subscriptions, check latest_receipt_info first
    if (productId === SUBSCRIPTION_ID && result.latest_receipt_info) {
      receiptInfo = result.latest_receipt_info.find(
        info => info.transaction_id === transactionId || info.original_transaction_id === transactionId
      );
      
      if (receiptInfo) {
        console.log('✅ Found subscription in latest_receipt_info');
        return {
          success: true,
          expiresAt: new Date(parseInt(receiptInfo.expires_date_ms)),
          purchaseDateMs: parseInt(receiptInfo.purchase_date_ms),
          originalTransactionId: receiptInfo.original_transaction_id
        };
      }
    }

    // For one-time purchases (tokens), check in_app or receipt.in_app
    const inAppPurchases = result.in_app || result.receipt?.in_app || [];
    receiptInfo = inAppPurchases.find(
      info => info.transaction_id === transactionId || info.original_transaction_id === transactionId
    );

    if (receiptInfo) {
      console.log('✅ Found purchase in in_app');
      return {
        success: true,
        purchaseDateMs: parseInt(receiptInfo.purchase_date_ms),
        originalTransactionId: receiptInfo.original_transaction_id
      };
    }

    console.error('❌ Transaction not found in receipt');
    return { success: false, error: 'Transaction not found in receipt' };

  } catch (error) {
    console.error('❌ Apple receipt validation error:', error);
    return { success: false, error: 'Apple validation request failed' };
  }
}

// CRITICAL FIX #8: Google Play validation (placeholder)
async function validateGooglePlayReceipt(purchaseToken: string, productId: string): Promise<{
  success: boolean;
  error?: string;
  purchaseDateMs?: number;
  originalTransactionId?: string;
  expiresAt?: Date;
}> {
  console.log('🤖 Validating Google Play receipt...');
  
  try {
    // TODO: Implement proper Google Play Developer API validation
    // For now, we'll assume the purchase token contains the purchase data
    // In production, you MUST validate with Google Play Developer API
    
    const purchaseData = JSON.parse(purchaseToken);
    const purchaseTime = purchaseData.purchaseTime || Date.now();
    
    // For subscriptions, calculate expiration (example: 30 days)
    let expiresAt: Date | undefined;
    if (productId === SUBSCRIPTION_ID) {
      expiresAt = new Date(purchaseTime + (30 * 24 * 60 * 60 * 1000)); // 30 days
    }
    
    console.log('✅ Google Play validation successful (placeholder)');
    
    return {
      success: true,
      purchaseDateMs: purchaseTime,
      originalTransactionId: purchaseData.orderId || purchaseData.transactionId,
      expiresAt
    };
    
  } catch (error) {
    console.error('❌ Google Play validation error:', error);
    return { success: false, error: 'Google Play validation failed' };
  }
}

// CRITICAL FIX #9: Update user_credits table properly
async function updateUserCredits(
  userId: string, 
  tokenAmount: number, 
  isPremiumSubscription: boolean,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<number> {
  try {
    console.log(`🪙 Updating user credits: ${tokenAmount} tokens, premium: ${isPremiumSubscription}`);
    
    // Get current user credits
    const getCurrentCreditsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${userId}`, 
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        }
      }
    );

    const currentCredits = await getCurrentCreditsResponse.json();
    const now = new Date();
    
    if (currentCredits.length > 0) {
      // Update existing credits
      const existing = currentCredits[0];
      const newRemaining = existing.remaining + tokenAmount;
      
      let updateData: any = {
        remaining: newRemaining,
        updated_at: now.toISOString(),
      };

      // Handle premium subscription updates
      if (isPremiumSubscription) {
        updateData.is_premium_subscriber = true;
        updateData.monthly_tokens_remaining = 150000; // Reset monthly tokens
        updateData.monthly_reset_date = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
      }

      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${userId}`, 
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (updateResponse.ok) {
        console.log('✅ User credits updated successfully');
        return tokenAmount;
      } else {
        const errorText = await updateResponse.text();
        console.error('❌ Failed to update user credits:', errorText);
        return 0;
      }
    } else {
      // Create new credits record
      let insertData: any = {
        user_id: userId,
        remaining: tokenAmount,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      if (isPremiumSubscription) {
        insertData.is_premium_subscriber = true;
        insertData.monthly_tokens_remaining = 150000;
        insertData.monthly_reset_date = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
      }

      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(insertData)
      });

      if (insertResponse.ok) {
        console.log('✅ User credits created successfully');
        return tokenAmount;
      } else {
        const errorText = await insertResponse.text();
        console.error('❌ Failed to create user credits:', errorText);
        return 0;
      }
    }
  } catch (error) {
    console.error('❌ Error updating user credits:', error);
    return 0;
  }
}