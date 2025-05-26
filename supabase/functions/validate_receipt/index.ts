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
  pending_renewal_info?: Array<{
    auto_renew_status: string;
    product_id: string;
  }>;
}

interface GooglePlayResponse {
  purchaseToken: string;
  orderId: string;
  productId: string;
  developerPayload: string;
  purchaseTime: number;
  purchaseState: number;
  consumptionState: number;
  acknowledgmentState: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token with auth API
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = authHeader.replace('Bearer ', '');
    
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      }
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { id: authenticatedUserId } = await authResponse.json();

    // Parse request body
    const { 
      receipt_data, 
      user_id, 
      product_id, 
      transaction_id, 
      platform 
    }: ValidateReceiptRequest = await req.json();

    // Use authenticated user ID if no user_id provided, or verify they match
    const userId = user_id || authenticatedUserId;
    if (user_id && user_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!receipt_data || !product_id || !transaction_id || !platform) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this transaction has already been processed (idempotency)
    const existingSubResponse = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}&transaction_id=eq.${transaction_id}`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      }
    });

    const existingSubs = await existingSubResponse.json();
    
    if (existingSubs.length > 0) {
      // Transaction already processed
      const existingSub = existingSubs[0];
      return new Response(
        JSON.stringify({ 
          success: true,
          alreadyProcessed: true,
          isActive: existingSub.is_active,
          expiresAt: existingSub.expires_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let validationResult;
    let expiresAt: Date;
    let purchaseDateMs: number;

    if (platform === 'ios') {
      validationResult = await validateAppleReceipt(receipt_data, transaction_id);
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({ error: validationResult.error }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      expiresAt = validationResult.expiresAt!;
      purchaseDateMs = validationResult.purchaseDateMs!;
    } else if (platform === 'android') {
      validationResult = await validateGooglePlayReceipt(receipt_data, product_id);
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({ error: validationResult.error }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // For Android, set expiration based on subscription duration
      // This is a simplified example - you may need to adjust based on your product
      purchaseDateMs = validationResult.purchaseDateMs!;
      expiresAt = new Date(purchaseDateMs + (30 * 24 * 60 * 60 * 1000)); // 30 days from purchase
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isActive = expiresAt > new Date();

    // Insert new subscription record
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
        original_transaction_id: transaction_id, // For compatibility
        latest_receipt: receipt_data,
        expires_at: expiresAt.toISOString(),
        purchase_date_ms: purchaseDateMs,
        is_active: isActive,
        product_id: product_id,
        platform: platform
      })
    });

    if (!insertResponse.ok) {
      console.error('Failed to insert subscription:', await insertResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to record subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Credit tokens for new active subscription
    let tokensAdded = 0;
    if (isActive) {
      try {
        const addTokensResponse = await fetch(`${supabaseUrl}/functions/v1/add_tokens`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            amount: 150000, // 150K tokens for Premium-Pass
            description: `Premium subscription purchase - ${platform}`
          })
        });

        if (addTokensResponse.ok) {
          const tokenData = await addTokensResponse.json();
          tokensAdded = 150000;
        } else {
          console.error('Failed to add tokens:', await addTokensResponse.text());
        }
      } catch (error) {
        console.error('Error adding tokens:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        isActive,
        expiresAt: expiresAt.toISOString(),
        tokensAdded,
        platform
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function validateAppleReceipt(receipt: string, transactionId: string): Promise<{
  success: boolean;
  error?: string;
  expiresAt?: Date;
  purchaseDateMs?: number;
}> {
  const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
  const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
  
  const receiptData = {
    'receipt-data': receipt,
    'password': Deno.env.get('APPLE_IAP_SHARED_SECRET') || '',
    'exclude-old-transactions': false
  };

  try {
    // Try production first
    let response = await fetch(productionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiptData)
    });

    let result: AppleReceiptResponse = await response.json();
    
    // Status 21007 means receipt is from sandbox
    if (result.status === 21007) {
      response = await fetch(sandboxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptData)
      });
      result = await response.json();
    }

    if (result.status !== 0) {
      return { success: false, error: `Apple validation failed with status: ${result.status}` };
    }

    if (!result.latest_receipt_info || result.latest_receipt_info.length === 0) {
      return { success: false, error: 'No receipt info found' };
    }

    // Find the matching transaction
    const receiptInfo = result.latest_receipt_info.find(
      info => info.transaction_id === transactionId || info.original_transaction_id === transactionId
    );

    if (!receiptInfo) {
      return { success: false, error: 'Transaction not found in receipt' };
    }

    return {
      success: true,
      expiresAt: new Date(parseInt(receiptInfo.expires_date_ms)),
      purchaseDateMs: parseInt(receiptInfo.purchase_date_ms)
    };

  } catch (error) {
    console.error('Apple receipt validation error:', error);
    return { success: false, error: 'Apple validation failed' };
  }
}

async function validateGooglePlayReceipt(purchaseToken: string, productId: string): Promise<{
  success: boolean;
  error?: string;
  purchaseDateMs?: number;
}> {
  // For Google Play validation, you would typically use the Google Play Developer API
  // This requires setting up service account credentials and making authenticated requests
  // For now, this is a placeholder that assumes the receipt is valid
  
  try {
    // TODO: Implement Google Play receipt validation
    // You'll need to:
    // 1. Set up Google Play Developer API credentials
    // 2. Use the purchaseToken to verify the purchase
    // 3. Check subscription status
    
    // For now, we'll parse the purchase token as JSON (react-native-iap format)
    const purchaseData = JSON.parse(purchaseToken);
    
    return {
      success: true,
      purchaseDateMs: purchaseData.purchaseTime || Date.now()
    };
    
  } catch (error) {
    console.error('Google Play validation error:', error);
    return { success: false, error: 'Google Play validation failed' };
  }
}