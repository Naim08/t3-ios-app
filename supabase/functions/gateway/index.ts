/* eslint-disable no-undef */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { ChatOpenAI } from "npm:@langchain/openai"
import { ChatAnthropic } from "npm:@langchain/anthropic"
import { ChatGoogleGenerativeAI } from "npm:@langchain/google-genai"
import { HumanMessage } from "npm:@langchain/core/messages"
import { TokenSpendingMiddleware } from "./middleware.ts"
import { getProviderConfig, isModelPremium } from "./providers.ts"
import { calculateTokenCost } from "./costs.ts"
import { ToolsRouter } from "./toolsRouter.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

interface StreamRequest {
  model: string
  messages: Array<{ role: string; content: string; tool_call_id?: string; name?: string }>
  stream?: boolean
  customApiKey?: string
  hasCustomKey?: boolean
  conversationId?: string
  personaId?: string
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

function createLLMInstance(modelId: string, config: any, tools?: any[]) {
  // Validate config
  if (!config) {
    throw new Error(`Configuration is missing for model: ${modelId}`)
  }
  
  if (!config.apiKey) {
    throw new Error(`API key is missing for model: ${modelId}`)
  }

  // Convert tools to OpenAI format for function calling
  const openAITools = tools?.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.json_schema
    }
  }))

  // Debug: tools loaded successfully

  if (modelId.startsWith('gpt-') || modelId.includes('openai')) {
    const chatOpenAI = new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streaming: true,
    })
    
    // Add tools if available
    if (openAITools && openAITools.length > 0) {
      return chatOpenAI.bind({ tools: openAITools })
    }
    return chatOpenAI
  } else if (modelId.startsWith('claude-')) {
    const chatAnthropic = new ChatAnthropic({
      anthropicApiKey: config.apiKey,
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streaming: true,
    })
    
    // Anthropic uses a different format - bind tools if available
    if (openAITools && openAITools.length > 0) {
      return chatAnthropic.bind({ tools: openAITools })
    }
    return chatAnthropic
  } else if (modelId.startsWith('gemini-') || modelId === 'gemini-pro') {
    // Additional validation for Google AI
    if (typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
      throw new Error(`Invalid Google API key for model: ${modelId}`)
    }
    
    const gemini = new ChatGoogleGenerativeAI({
      apiKey: config.apiKey.trim(),
      model: config.model, // Use the correct model name from config
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      streaming: true,
    })
    
    // Google AI also supports function calling
    if (openAITools && openAITools.length > 0) {
      return gemini.bind({ tools: openAITools })
    }
    return gemini
  }
  
  throw new Error(`Unsupported model: ${modelId}`)
}

Deno.serve(async (req: Request) => {
  // Gateway function called

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
    const { model, messages, customApiKey, conversationId, personaId }: StreamRequest = await req.json()
    
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

    // Fetch available tools for persona
    let availableTools: any[] = []
    
    if (personaId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
        
        // Get persona tools
        const personaResponse = await fetch(`${supabaseUrl}/rest/v1/personas?id=eq.${encodeURIComponent(personaId)}&select=tool_ids`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          }
        })
        
        if (personaResponse.ok) {
          const personas = await personaResponse.json()
          
          if (personas && personas.length > 0 && personas[0].tool_ids) {
            const toolIds = personas[0].tool_ids
            
            if (toolIds.length > 0) {
              // Fetch tool definitions
              const toolsQuery = toolIds.map((id: string) => `id.eq.${encodeURIComponent(id)}`).join(',')
              
              const toolsResponse = await fetch(`${supabaseUrl}/rest/v1/tools?or=(${toolsQuery})&select=*`, {
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'apikey': supabaseKey,
                  'Content-Type': 'application/json'
                }
              })
              
              if (toolsResponse.ok) {
                const tools = await toolsResponse.json()
                
                // Filter out premium tools if user doesn't have access
                availableTools = tools.filter((tool: any) => 
                  !tool.requires_premium || isSubscriber || hasCustomKey
                )
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching persona tools:', error)
        // Continue without tools if there's an error
      }
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

    // Create LLM instance with tools
    const llm = createLLMInstance(model, config, availableTools)
    
    // Initialize ToolsRouter for tool execution
    const toolsRouter = new ToolsRouter(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      userToken,
      userId,
      isSubscriber,
      hasCustomKey
    )
    
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
    let completeResponse = '' // Accumulate the complete assistant response
    
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
                  
                  // Accumulate the complete response
                  completeResponse += token
                  
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
                async handleLLMEnd(output: any) {
                  // Extract tool calls from LangChain response structure
                  // Try multiple paths as LangChain structure can vary
                  const message = output?.generations?.[0]?.[0]?.message
                  const toolCalls = message?.additional_kwargs?.tool_calls || 
                                   message?.kwargs?.additional_kwargs?.tool_calls ||
                                   message?.tool_calls
                  
                  // Check if the output contains tool calls
                  if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
                    try {
                      // additional_kwargs.tool_calls is already in the correct format for ToolsRouter
                      
                      // Execute tool calls
                      const { results, totalTokens } = await toolsRouter.processToolCalls(toolCalls)
                      
                      // Stream tool results back
                      for (const result of results) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          role: 'tool',
                          tool_call_id: result.tool_call_id,
                          name: result.name,
                          content: result.content
                        })}\n\n`))
                      }
                      
                      // Add tool token costs
                      completionTokens += totalTokens
                      
                      // Continue the conversation with tool results
                      
                      // For now, we'll just stream a message indicating the tool was executed
                      // The client should handle the tool results and display them appropriately
                      const toolSummary = results.map(r => {
                        try {
                          const content = JSON.parse(r.content)
                          if (r.name === 'weather' && content.success) {
                            const data = content.data
                            return `\n\nWeather in ${data.location}:\n- Current: ${data.current.temperature}°C, ${data.current.condition}\n- Humidity: ${data.current.humidity}%\n- Wind: ${data.current.wind_speed} km/h\n\nForecast:\n${data.forecast.map((f: any) => `- ${f.date}: ${f.low}°C - ${f.high}°C, ${f.condition}`).join('\n')}`
                          }
                          
                          if (r.name === 'wiki' && content.success) {
                            const data = content.data
                            
                            if (data.results && data.results.length > 0) {
                              let wikiText = '\n\n**Wikipedia Results:**\n'
                              data.results.forEach((result: any, index: number) => {
                                wikiText += `\n${index + 1}. **${result.title}**\n`
                                
                                // Add image if available
                                if (result.thumbnail) {
                                  wikiText += `![${result.title}](${result.thumbnail})\n\n`
                                }
                                
                                wikiText += `${result.extract}\n`
                                
                                if (result.url) {
                                  wikiText += `\n[Read full article on Wikipedia](${result.url})\n`
                                }
                              })
                              return wikiText
                            } else {
                              return `\n\nNo Wikipedia results found for "${data.query}".`
                            }
                          }
                          
                          return `\n\nTool ${r.name} executed successfully.`
                        } catch {
                          return `\n\nTool ${r.name} result: ${r.content}`
                        }
                      }).join('')
                      
                      // Add tool summary to complete response
                      completeResponse += toolSummary
                      
                      // Stream the tool results in smaller chunks to avoid cutoff
                      const chunkSize = 500 // characters per chunk
                      for (let i = 0; i < toolSummary.length; i += chunkSize) {
                        const chunk = toolSummary.slice(i, i + chunkSize)
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`))
                        // Small delay between chunks to ensure proper transmission
                        await new Promise(resolve => setTimeout(resolve, 10))
                      }
                      
                      // Ensure the stream is flushed before continuing
                      await new Promise(resolve => setTimeout(resolve, 200))
                      
                    } catch (error) {
                      console.error('Tool execution error:', error)
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        error: 'Tool execution failed' 
                      })}\n\n`))
                    }
                  }
                  
                  // Wait longer before sending the final completion event to ensure all chunks are transmitted
                  await new Promise(resolve => setTimeout(resolve, 500))
                  
                  // Calculate final token cost
                  const totalCost = calculateTokenCost(model, promptTokens, completionTokens)
                  
                  // Save assistant message to database if we have a conversation ID
                  if (conversationId && completeResponse.trim()) {
                    try {
                      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
                      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
                      
                      const saveResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${userToken}`,
                          'apikey': supabaseKey,
                          'Content-Type': 'application/json',
                          'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                          conversation_id: conversationId,
                          role: 'assistant',
                          content: completeResponse.trim(),
                          model_used: model
                        })
                      })
                      
                      if (!saveResponse.ok) {
                        console.error('Failed to save assistant message:', await saveResponse.text())
                      }
                    } catch (error) {
                      console.error('Error saving assistant message:', error)
                    }
                  }
                  
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
          for await (const _chunk of streamResponse) {
            // The actual streaming is handled by the callbacks above
          }
          
        } catch (error) {
          console.error('Streaming error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
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

