/* eslint-disable no-undef */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpendTokensRequest {
  amount: number;
  description?: string;
  idempotency_key?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body: SpendTokensRequest = await req.json();
    
    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use idempotency key if provided, otherwise generate one
    const idempotencyKey = body.idempotency_key || crypto.randomUUID();
    
    // First, check if this transaction already exists
    if (body.idempotency_key) {
      const { data: existingTx } = await supabase
        .from('tx_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('idempotency_key', idempotencyKey)
        .single();
      
      if (existingTx) {
        // Return the existing transaction result
        return new Response(
          JSON.stringify({
            success: existingTx.status === 'completed',
            remaining_tokens: existingTx.metadata?.remaining_tokens || 0,
            transaction_id: existingTx.id
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Create transaction log entry
    const { data: txLog, error: txError } = await supabase
      .from('tx_log')
      .insert({
        user_id: user.id,
        idempotency_key: idempotencyKey,
        model: body.model || 'unknown',
        prompt_tokens: body.prompt_tokens || 0,
        completion_tokens: body.completion_tokens || Math.ceil(body.amount),
        total_tokens: body.amount,
        total_cost: body.amount,
        status: 'pending',
        metadata: { description: body.description }
      })
      .select()
      .single();
    
    if (txError) {
      console.error('Error creating transaction log:', txError);
      // Continue without tx_log if it fails
    }

    // Call the spend_user_tokens function
    const { data, error } = await supabase.rpc('spend_user_tokens', {
      user_uuid: user.id,
      amount: body.amount,
    });

    if (error) {
      console.error('Error spending tokens:', error);
      
      // Update transaction log as failed
      if (txLog) {
        await supabase
          .from('tx_log')
          .update({ 
            status: 'failed',
            error_message: error.message
          })
          .eq('id', txLog.id);
      }
      
      // Check if it's an insufficient credits error
      if (error.message?.includes('insufficient_credits')) {
        return new Response(
          JSON.stringify({ 
            error: 'insufficient_credits'
          }),
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to spend tokens' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Update transaction log as completed
    if (txLog) {
      await supabase
        .from('tx_log')
        .update({ 
          status: 'completed',
          metadata: { 
            ...txLog.metadata,
            remaining_tokens: data?.remaining_tokens || 0
          }
        })
        .eq('id', txLog.id);
    }

    return new Response(
      JSON.stringify({
        ...data,
        transaction_id: txLog?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
