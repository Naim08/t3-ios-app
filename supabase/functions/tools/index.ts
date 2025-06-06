// Tools router - routes to individual tool implementations
import { getWeatherData } from './weather.ts'
import { searchWikipedia } from './wiki.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface ToolRequest {
  tool: string
  [key: string]: any
}

Deno.serve(async (req: Request) => {
  console.log('🔧 TOOLS: Function called with method:', req.method, 'URL:', req.url)
  
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
    // Parse request body first
    const requestData = await req.json()
    console.log('🔧 TOOLS: Received request data:', JSON.stringify(requestData, null, 2))
    console.log('🔧 TOOLS: Request data type:', typeof requestData)
    console.log('🔧 TOOLS: Request data keys:', Object.keys(requestData || {}))
    
    // Get tool name from request body (new method) or URL path (fallback)
    let toolName = requestData?.tool_name
    console.log('🔧 TOOLS: Extracted tool_name:', toolName, 'type:', typeof toolName)
    
    if (!toolName) {
      // Fallback: try to get from URL path
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      toolName = pathParts[pathParts.length - 1] // Last part of path
      console.log('🔧 TOOLS: Using URL fallback, toolName from path:', toolName, 'URL:', req.url)
    }

    if (!toolName || toolName === 'tools') {
      console.log('🔧 TOOLS: Invalid tool name, returning error')
      return new Response(
        JSON.stringify({ 
          error: 'Tool name is required in request body (tool_name field) or URL path',
          debug: {
            toolName,
            requestData,
            url: req.url
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔧 TOOLS: Processing tool:', toolName, 'with args:', requestData)
    console.log('🔧 TOOLS: About to enter switch statement with toolName:', toolName)

    let result
    switch (toolName) {
      case 'weather':
        console.log('🔧 TOOLS: Calling getWeatherData with location:', requestData.location, 'units:', requestData.units)
        try {
          result = await getWeatherData(requestData.location, requestData.units)
          console.log('🔧 TOOLS: Weather result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: Weather function error:', error)
          throw error
        }
        break
        
      case 'wiki':
        console.log('🔧 TOOLS: Calling searchWikipedia with query:', requestData.query, 'limit:', requestData.limit)
        try {
          result = await searchWikipedia(requestData.query, requestData.limit)
          console.log('🔧 TOOLS: Wiki result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: Wiki function error:', error)
          throw error
        }
        break
        
      case 'code_search':
        // For now, return a placeholder since we don't have the implementation
        result = {
          success: true,
          data: {
            results: [
              {
                title: `${requestData.language} Documentation`,
                snippet: `Code examples for ${requestData.query} in ${requestData.language}`,
                url: `https://docs.${requestData.language}.org/search?q=${requestData.query}`
              }
            ],
            query: requestData.query,
            language: requestData.language
          },
          message: `Code search results for ${requestData.query} in ${requestData.language}`
        }
        break
        
      default:
        console.log('🔧 TOOLS: Hit default case with toolName:', toolName)
        return new Response(
          JSON.stringify({ error: `Unknown tool: ${toolName}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Tools router error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Tool execution failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
