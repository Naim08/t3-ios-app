// Note: We'll use direct HTTP calls to Supabase instead of the client
// to avoid import issues in the edge function environment

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
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
    console.log('🔧 TOOLSROUTER: processToolCalls called with:', JSON.stringify(toolCalls, null, 2))
    const results = []
    let totalTokens = 0

    for (const toolCall of toolCalls) {
      console.log('🔧 TOOLSROUTER: Processing tool call:', toolCall.id, toolCall.function.name)
      try {
        const result = await this.executeToolCall(toolCall)
        console.log('🔧 TOOLSROUTER: Tool execution successful:', result)
        results.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result)
        })
        totalTokens += result.tokensUsed || 0
      } catch (error) {
        console.error('🔧 TOOLSROUTER: Tool execution error:', error)
        results.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({ error: error.message })
        })
      }
    }

    console.log('🔧 TOOLSROUTER: Returning results:', results)
    return { results, totalTokens }
  }

  private async executeToolCall(toolCall: ToolCall): Promise<any> {
    const { name, arguments: argsString } = toolCall.function
    console.log('🔧 TOOLSROUTER: executeToolCall - name:', name, 'args:', argsString)
    
    // Parse arguments
    let args
    try {
      args = JSON.parse(argsString)
      console.log('🔧 TOOLSROUTER: Parsed arguments:', args)
    } catch (error) {
      console.error('🔧 TOOLSROUTER: Failed to parse arguments:', error)
      throw new Error('Invalid tool arguments')
    }

    // Look up tool in database
    console.log('🔧 TOOLSROUTER: Looking up tool in database...')
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
        console.log(`Tool call ${toolCall.id} already executed, returning cached result`)
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
      console.log('🔧 TOOLSROUTER: Token spending successful:', spendResult)
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
    console.log('🔧 TOOLSROUTER: callToolEndpoint - tool.endpoint:', tool.endpoint)
    
    // If it's a relative path (e.g., "/tools/weather"), extract tool name and call tools function
    if (tool.endpoint.startsWith('/')) {
      const functionName = tool.endpoint.replace('/tools/', '').replace('/', '')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
      
      console.log('🔧 TOOLSROUTER: Calling relative endpoint via tools function for:', functionName)
      
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
      console.log('🔧 TOOLSROUTER: Calling external endpoint:', tool.endpoint)
      
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
      console.log('🔧 TOOLSROUTER: Calling tools function for:', functionName)
      
      const requestBody = {
        tool_name: functionName,
        ...args
      }
      console.log('🔧 TOOLSROUTER: Sending request body:', JSON.stringify(requestBody, null, 2))
      
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