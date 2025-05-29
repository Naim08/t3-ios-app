/* eslint-disable no-undef */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { ChatOpenAI } from "npm:@langchain/openai"
import { ChatAnthropic } from "npm:@langchain/anthropic"
import { ChatGoogleGenerativeAI } from "npm:@langchain/google-genai"
import { HumanMessage } from "npm:@langchain/core/messages"
import { TokenSpendingMiddleware } from "./middleware.js"
import { getProviderConfig, isModelPremium } from "./providers.js"
import { calculateTokenCost } from "./costs.js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

interface StreamRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
  customApiKey?: string
  hasCustomKey?: boolean
}

async function authenticateUser(authHeader: string): Promise<{ userId: string; isSubscriber: boolean; hasCustomKey: boolean, userToken: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  
  // Handle Bearer token extraction safely
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header format')
  }
  
  const userToken = authHeader.slice(7) // Remove 'Bearer ' prefix
  
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
    }
  })

  if (!authResponse.ok) {
    throw new Error('Unauthorized')
  }

  const user = await authResponse.json()
  
  // Check user subscription status and custom key
  // This is a simplified check - in real app, you'd query the database
  const isSubscriber = user.user_metadata?.subscription_status === 'active'
  const hasCustomKey = !!user.user_metadata?.custom_api_key
  
  return { 
    userId: user.id, 
    isSubscriber,
    hasCustomKey, 
    userToken
  }
}

function createLLMInstance(modelId: string, config: any) {
  // Validate config
  if (!config) {
    throw new Error(`Configuration is missing for model: ${modelId}`)
  }
  
  if (!config.apiKey) {
    throw new Error(`API key is missing for model: ${modelId}`)
  }

  if (modelId.startsWith('gpt-') || modelId.includes('openai')) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streaming: true,
    })
  } else if (modelId.startsWith('claude-')) {
    return new ChatAnthropic({
      anthropicApiKey: config.apiKey,
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streaming: true,
    })
  } else if (modelId.startsWith('gemini-') || modelId === 'gemini-pro') {
    // Additional validation for Google AI
    if (typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
      throw new Error(`Invalid Google API key for model: ${modelId}`)
    }
    
    return new ChatGoogleGenerativeAI({
      apiKey: config.apiKey.trim(),
      model: config.model, // Use the correct model name from config
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      streaming: true,
    })
  }
  
  throw new Error(`Unsupported model: ${modelId}`)
}

Deno.serve(async (req: Request) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, isSubscriber, hasCustomKey, userToken } = await authenticateUser(authHeader)
    
    // Parse request
    const { model, messages, customApiKey }: StreamRequest = await req.json()
    
    if (!model || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check model access permissions
    const modelIsPremium = isModelPremium(model)
    if (modelIsPremium && !isSubscriber && !hasCustomKey) {
      return new Response(
        JSON.stringify({ error: 'Premium model requires subscription or custom API key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get provider configuration
    const config = getProviderConfig(model, hasCustomKey, customApiKey)
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Unsupported model' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate API key
    if (!config.apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured for this model' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create LLM instance
    const llm = createLLMInstance(model, config)
    
    // Set up token spending middleware (only for non-premium models or users without subscription)
    let tokenMiddleware: TokenSpendingMiddleware | null = null
    if (!modelIsPremium || (!isSubscriber && !hasCustomKey)) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      
      // We'll initialize this after we calculate prompt tokens
      // tokenMiddleware = new TokenSpendingMiddleware(userId, supabaseUrl, userToken, model, promptTokens)
    }

    // Convert messages to LangChain format
    const langchainMessages = messages.map(msg => 
      new HumanMessage(msg.content)
    )

    // Create streaming response
    const encoder = new TextEncoder()
    let promptTokens = 0
    let completionTokens = 0
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Estimate prompt tokens (rough estimation)
          const promptText = messages.map(m => m.content).join(' ')
          promptTokens = Math.ceil(promptText.length / 4)

          // Initialize token middleware now that we have prompt tokens
          if (!modelIsPremium || (!isSubscriber && !hasCustomKey)) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            tokenMiddleware = new TokenSpendingMiddleware(userId, supabaseUrl, userToken, model, promptTokens)
          }

          // Stream the response
          const streamResponse = await llm.stream(langchainMessages, {
            callbacks: [
              {
                handleLLMNewToken(token: string) {
                  // Filter out empty, whitespace-only, or null tokens
                  if (!token || typeof token !== 'string' || token.trim() === '' || token.length === 0) {
                    return;
                  }
                  
                  // Additional filtering for LangChain artifacts
                  if (token === '\n' || token === '\r' || token === '\r\n') {
                    // Send newlines as they are important for formatting
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
                    return;
                  }
                  
                  // Send token to client
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
                  
                  // Count completion tokens (rough estimation by character count)
                  completionTokens += Math.max(1, Math.ceil(token.length / 4))
                  
                  // Use improved token accumulation that tracks actual text
                  if (tokenMiddleware) {
                    tokenMiddleware.accumulateText(token).catch(error => {
                      if (error.message === 'insufficient_credits') {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'insufficient_credits' })}\n\n`))
                        controller.close()
                      }
                    })
                  }
                },
                async handleLLMEnd() {
                  // Calculate final token cost
                  const totalCost = calculateTokenCost(model, promptTokens, completionTokens)
                  
                  // Finalize token spending
                  if (tokenMiddleware) {
                    try {
                      await tokenMiddleware.finalize()
                    } catch (error) {
                      console.error('Error finalizing token spend:', error)
                    }
                  }
                  
                  // Send completion event
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    done: true, 
                    usage: { 
                      prompt_tokens: promptTokens, 
                      completion_tokens: completionTokens,
                      total_cost: totalCost
                    }
                  })}\n\n`))
                  controller.close()
                },
                handleLLMError(error: Error) {
                  console.error('LLM Error:', error)
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
                  controller.close()
                }
              }
            ]
          })

          // Process the stream (this will trigger the callbacks)
          for await (const chunk of streamResponse) {
            // The actual streaming is handled by the callbacks above
          }
          
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      }
    })

  } catch (error) {
    console.error('Gateway error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

