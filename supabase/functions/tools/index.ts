// Tools router - routes to individual tool implementations
import { getWeatherData } from './weather.ts'
import { searchWikipedia } from './wiki.ts'
import { planTrip } from './tripplanner.ts'
import { getNutritionData } from './nutrition.ts'
import { convertUnits } from './convert.ts'
import { searchFlights } from './flights.ts'
import { summariseContent } from './summarise.ts'
import { convertMarkdownToSlides } from './md2slides.ts'
import { getMoodMusic } from './moodmusic.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface ToolRequest {
  tool: string
  [key: string]: unknown
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
        
      case 'tripplanner':
        console.log('🔧 TOOLS: Calling planTrip with params:', requestData)
        try {
          result = await planTrip(requestData)
          console.log('🔧 TOOLS: Trip Planner result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: Trip Planner function error:', error)
          throw error
        }
        break
        
      case 'nutrition':
        console.log('🔧 TOOLS: Calling getNutritionData with food_query:', requestData.food_query, 'serving_size:', requestData.serving_size)
        try {
          result = await getNutritionData(requestData.food_query, requestData.serving_size)
          console.log('🔧 TOOLS: Nutrition result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: Nutrition function error:', error)
          throw error
        }
        break
        
      case 'convert':
        console.log('🔧 TOOLS: Calling convertUnits with amount:', requestData.amount, 'from:', requestData.from, 'to:', requestData.to, 'type:', requestData.type)
        try {
          result = await convertUnits(requestData.amount, requestData.from, requestData.to, requestData.type)
          console.log('🔧 TOOLS: Convert result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: Convert function error:', error)
          throw error
        }
        break
        
      case 'flights':
        console.log('🔧 TOOLS: Calling searchFlights with params:', requestData)
        try {
          result = await searchFlights(requestData)
          console.log('🔧 TOOLS: Flights result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: Flights function error:', error)
          throw error
        }
        break
        
      case 'summarise':
        console.log('🔧 TOOLS: Calling summariseContent with url:', requestData.url, 'summary_length:', requestData.summary_length)
        try {
          result = await summariseContent(requestData.url, requestData.summary_length, requestData.focus_topics)
          console.log('🔧 TOOLS: Summarise result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: Summarise function error:', error)
          throw error
        }
        break
        
      case 'md2slides':
        console.log('🔧 TOOLS: Calling convertMarkdownToSlides with params:', requestData)
        try {
          result = await convertMarkdownToSlides(requestData)
          console.log('🔧 TOOLS: MD2Slides result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: MD2Slides function error:', error)
          throw error
        }
        break
        
      case 'moodmusic':
        console.log('🔧 TOOLS: Calling getMoodMusic with mood:', requestData.mood, 'activity:', requestData.activity)
        try {
          result = await getMoodMusic(requestData)
          console.log('🔧 TOOLS: MoodMusic result:', JSON.stringify(result, null, 2))
        } catch (error) {
          console.error('🔧 TOOLS: MoodMusic function error:', error)
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