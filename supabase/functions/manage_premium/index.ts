/* eslint-disable no-undef */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { id: userId } = await authResponse.json();

    const { action } = await req.json()

    if (action === 'grant') {
      // Grant premium subscription and monthly tokens
      const dbResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/grant_premium_monthly_tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_uuid: userId })
      });

      if (!dbResponse.ok) {
        console.error('Error granting premium tokens:', await dbResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to grant premium tokens' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const data = await dbResponse.json();

      return new Response(
        JSON.stringify({ data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else if (action === 'cancel') {
      // Cancel premium subscription
      const dbResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/cancel_premium_subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_uuid: userId })
      });

      if (!dbResponse.ok) {
        console.error('Error canceling premium subscription:', await dbResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to cancel premium subscription' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const data = await dbResponse.json();

      return new Response(
        JSON.stringify({ data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "grant" or "cancel"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
