// Note: We'll use direct HTTP calls to Supabase instead of the client
// to avoid import issues in the edge function environment

interface ToolCall {
  id: string
  type: 'function'
  function?: {
    name: string
    arguments: string
  }
  // Gemini format
  name?: string
  args?: any
}

interface Tool {
  id: string
  name: string
  description: string
  json_schema: any
  endpoint: string
  cost_tokens: number
  requires_premium: boolean
}

export class ToolsRouter {
  private supabaseUrl: string
  private supabaseKey: string
  private userToken: string
  private userId: string
  private isSubscriber: boolean
  private hasCustomKey: boolean

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    userToken: string,
    userId: string,
    isSubscriber: boolean,
    hasCustomKey: boolean
  ) {
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseKey
    this.userToken = userToken
    this.userId = userId
    this.isSubscriber = isSubscriber
    this.hasCustomKey = hasCustomKey
  }

  async processToolCalls(toolCalls: ToolCall[]): Promise<{ results: any[], totalTokens: number }> {
    const results = []
    let totalTokens = 0

    console.log('🔧 TOOLSROUTER: Processing tool calls:', JSON.stringify(toolCalls, null, 2))

    if (!toolCalls || !Array.isArray(toolCalls)) {
      console.error('🔧 TOOLSROUTER: Invalid toolCalls provided:', toolCalls)
      return { results: [], totalTokens: 0 }
    }

    for (const toolCall of toolCalls) {
      if (!toolCall) {
        console.error('🔧 TOOLSROUTER: Null or undefined toolCall encountered')
        continue
      }

      try {
        const result = await this.executeToolCall(toolCall)
        const toolName = toolCall.function?.name || toolCall.name || 'unknown'
        const toolId = toolCall.id || `unknown_${Date.now()}`
        
        results.push({
          role: 'tool',
          tool_call_id: toolId,
          name: toolName,
          content: JSON.stringify(result)
        })
        totalTokens += result.tokensUsed || 0
      } catch (error) {
        console.error('🔧 TOOLSROUTER: Tool execution error:', error)
        const toolName = toolCall.function?.name || toolCall.name || 'unknown'
        const toolId = toolCall.id || `error_${Date.now()}`
        
        results.push({
          role: 'tool',
          tool_call_id: toolId,
          name: toolName,
          content: JSON.stringify({ error: error.message })
        })
      }
    }

    return { results, totalTokens }
  }

  private async executeToolCall(toolCall: ToolCall): Promise<any> {
    console.log('🔧 TOOLSROUTER: Executing tool call:', JSON.stringify(toolCall, null, 2))
    
    // Handle different tool call formats (OpenAI vs Gemini)
    let name: string
    let args: any
    
    if (toolCall.function) {
      // OpenAI format
      name = toolCall.function.name
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch (error) {
        console.error('🔧 TOOLSROUTER: Failed to parse OpenAI arguments:', error)
        throw new Error('Invalid tool arguments')
      }
    } else if (toolCall.name) {
      // Gemini format
      name = toolCall.name
      args = toolCall.args || {}
    } else {
      console.error('🔧 TOOLSROUTER: Invalid tool call structure:', toolCall)
      throw new Error('Invalid tool call structure')
    }
    
    console.log('🔧 TOOLSROUTER: Extracted name:', name, 'args:', args)

    // Look up tool in database
    const toolResponse = await fetch(`${this.supabaseUrl}/rest/v1/tools?name=eq.${encodeURIComponent(name)}&select=*`, {
      headers: {
        'Authorization': `Bearer ${this.userToken}`,
        'apikey': this.supabaseKey,
        'Content-Type': 'application/json'
      }
    })

    if (!toolResponse.ok) {
      throw new Error(`Failed to fetch tool: ${toolResponse.statusText}`)
    }

    const tools = await toolResponse.json()
    if (!tools || tools.length === 0) {
      throw new Error(`Tool not found: ${name}`)
    }

    const tool = tools[0]

    // Check premium requirement
    if (tool.requires_premium && !this.isSubscriber && !this.hasCustomKey) {
      throw new Error('This tool requires a premium subscription')
    }

    // Validate arguments against schema
    this.validateArguments(args, tool.json_schema)

    // Check for duplicate execution
    const logResponse = await fetch(
      `${this.supabaseUrl}/rest/v1/tool_call_log?user_id=eq.${this.userId}&call_id=eq.${encodeURIComponent(toolCall.id)}&select=result`,
      {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'apikey': this.supabaseKey,
          'Content-Type': 'application/json'
        }
      }
    )

    if (logResponse.ok) {
      const existingCalls = await logResponse.json()
      if (existingCalls && existingCalls.length > 0) {
        return existingCalls[0].result
      }
    }

    // Deduct tokens before execution (if not subscriber and not using custom key)
    if (!this.isSubscriber && !this.hasCustomKey && tool.cost_tokens > 0) {
      const spendResponse = await fetch(`${this.supabaseUrl}/rest/v1/rpc/spend_user_tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'apikey': this.supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_uuid: this.userId,
          amount: tool.cost_tokens
        })
      })

      if (!spendResponse.ok) {
        const errorText = await spendResponse.text()
        console.error('🔧 TOOLSROUTER: Token spending failed:', errorText)
        throw new Error('Insufficient credits for tool execution')
      }
      
      const spendResult = await spendResponse.json()
    }

    // Execute the tool
    const result = await this.callToolEndpoint(tool, args)

    // Log the execution
    await fetch(`${this.supabaseUrl}/rest/v1/tool_call_log`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.userToken}`,
        'apikey': this.supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: this.userId,
        tool_id: tool.id,
        call_id: toolCall.id,
        arguments: args,
        result: result,
        tokens_spent: tool.cost_tokens
      })
    })

    return { ...result, tokensUsed: tool.cost_tokens }
  }

  private validateArguments(args: any, schema: any) {
    // Basic validation - in production, use a proper JSON schema validator
    const required = schema.required || []
    for (const field of required) {
      if (!(field in args)) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Validate types
    const properties = schema.properties || {}
    for (const [key, value] of Object.entries(args)) {
      if (properties[key]) {
        const expectedType = properties[key].type
        let actualType = Array.isArray(value) ? 'array' : typeof value
        
        // Handle integer type (JavaScript doesn't distinguish between integer and number)
        if (expectedType === 'integer' && actualType === 'number') {
          // Check if it's actually an integer
          if (!Number.isInteger(value)) {
            throw new Error(`Invalid type for ${key}: expected integer, got decimal number`)
          }
          // It's a valid integer, so skip the type mismatch error
          continue
        }
        
        // Handle number/integer compatibility
        if ((expectedType === 'number' || expectedType === 'integer') && actualType === 'number') {
          continue
        }
        
        if (expectedType && actualType !== expectedType) {
          throw new Error(`Invalid type for ${key}: expected ${expectedType}, got ${actualType}`)
        }
      }
    }
  }

  private async callToolEndpoint(tool: Tool, args: any): Promise<any> {
    
    // If it's a relative path (e.g., "/tools/weather"), extract tool name and call tools function
    if (tool.endpoint.startsWith('/')) {
      const functionName = tool.endpoint.replace('/tools/', '').replace('/', '')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
      
      
      const response = await fetch(`${supabaseUrl}/functions/v1/tools`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tool_name: functionName,
          ...args
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('🔧 TOOLSROUTER: Tool execution failed with status:', response.status, 'response:', error)
        throw new Error(`Tool execution failed: ${error}`)
      }

      return await response.json()
    }
    
    // If it's a full URL, call external endpoint
    if (tool.endpoint.startsWith('http')) {
      
      const response = await fetch(tool.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(args)
      })

      if (!response.ok) {
        throw new Error(`External tool failed: ${response.statusText}`)
      }

      return await response.json()
    }

    // If it's just a function name (legacy format), call the tools router function
    if (tool.endpoint && !tool.endpoint.includes('/') && !tool.endpoint.includes('.')) {
      const functionName = tool.endpoint
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
      
      // Call the tools edge function and pass the tool name in the request body
      
      const requestBody = {
        tool_name: functionName,
        ...args
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/tools`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('🔧 TOOLSROUTER: Tool execution failed with status:', response.status, 'response:', error)
        throw new Error(`Tool execution failed: ${error}`)
      }

      return await response.json()
    }

    console.error('🔧 TOOLSROUTER: Invalid tool endpoint format:', tool.endpoint)
    throw new Error('Invalid tool endpoint')
  }

  // Helper to check if a message contains tool calls
  static hasToolCalls(message: any): boolean {
    return message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0
  }

  // Helper to format tool results for streaming
  static formatToolResults(results: any[]): string {
    return results.map(result => 
      `data: ${JSON.stringify({ 
        role: 'tool',
        tool_call_id: result.tool_call_id,
        name: result.name,
        content: result.content
      })}\n\n`
    ).join('')
  }
}