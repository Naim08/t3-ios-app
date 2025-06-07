// Summarise tool using Readability + GPT-3.5

export interface SummariseRequest {
  url: string
  summary_length: 'brief' | 'medium' | 'detailed'
  focus_topics?: string[]
}

export interface SummariseResponse {
  title: string
  url: string
  summary: string
  key_points: string[]
  word_count: number
  reading_time: number
  source_length: number
}

export async function summariseContent(
  url: string,
  summary_length: string = 'medium',
  focus_topics?: string[]
): Promise<{ success: boolean; data: SummariseResponse; message: string }> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
  
  if (!OPENAI_API_KEY) {
    return {
      success: false,
      data: {} as SummariseResponse,
      message: 'OpenAI API key not configured'
    }
  }

  try {
    // Step 1: Fetch and extract content using Readability
    const extractedContent = await extractContentWithReadability(url)
    
    if (!extractedContent.success) {
      throw new Error(extractedContent.error || 'Failed to extract content')
    }

    // Step 2: Use GPT-3.5 to summarize the content
    const summaryPrompt = buildSummaryPrompt(
      extractedContent.content, 
      extractedContent.title,
      summary_length,
      focus_topics
    )
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates clear, accurate summaries of web content. Always respond with valid JSON in the exact format requested.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        max_tokens: summary_length === 'brief' ? 500 : summary_length === 'medium' ? 1000 : 1500,
        temperature: 0.3
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Parse the AI response (expecting JSON)
    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch {
      // If JSON parsing fails, create a structured response
      parsedResponse = {
        summary: aiResponse,
        key_points: aiResponse.split('\n').filter(line => line.trim().startsWith('-')).slice(0, 5)
      }
    }

    const wordCount = extractedContent.content.split(/\s+/).length
    const readingTime = Math.ceil(wordCount / 200) // Average reading speed: 200 words/minute

    const summariseResponse: SummariseResponse = {
      title: extractedContent.title || 'Untitled',
      url: url,
      summary: parsedResponse.summary || 'Summary not available',
      key_points: parsedResponse.key_points || [],
      word_count: parsedResponse.summary ? parsedResponse.summary.split(/\s+/).length : 0,
      reading_time: readingTime,
      source_length: wordCount
    }

    return {
      success: true,
      data: summariseResponse,
      message: `Successfully summarized content from ${url}`
    }

  } catch (error) {
    console.error('Summarise error:', error)
    return {
      success: false,
      data: {} as SummariseResponse,
      message: `Failed to summarize content: ${(error as Error).message}`
    }
  }
}

async function extractContentWithReadability(url: string): Promise<{
  success: boolean
  content: string
  title: string
  error?: string
}> {
  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PocketT3-Summariser/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Simple content extraction (basic implementation)
    // In a real implementation, you'd use Mozilla's Readability library
    const contentExtracted = extractMainContent(html)
    
    return {
      success: true,
      content: contentExtracted.content,
      title: contentExtracted.title
    }
    
  } catch (error) {
    return {
      success: false,
      content: '',
      title: '',
      error: (error as Error).message
    }
  }
}

function extractMainContent(html: string): { content: string; title: string } {
  // Basic HTML content extraction (simplified version of Readability)
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled'
  
  // Remove script and style tags
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  
  // Extract text from common content containers
  const contentSelectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<div[^>]*class=[^>]*content[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class=[^>]*post[^>]*>([\s\S]*?)<\/div>/gi
  ]
  
  let extractedContent = ''
  
  for (const selector of contentSelectors) {
    const matches = content.match(selector)
    if (matches && matches.length > 0) {
      extractedContent = matches[0]
      break
    }
  }
  
  // If no specific content container found, extract from body
  if (!extractedContent) {
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    extractedContent = bodyMatch ? bodyMatch[1] : content
  }
  
  // Strip HTML tags and clean up
  extractedContent = extractedContent.replace(/<[^>]+>/g, ' ')
  extractedContent = extractedContent.replace(/\s+/g, ' ')
  extractedContent = extractedContent.trim()
  
  // Limit content length to avoid token limits
  if (extractedContent.length > 8000) {
    extractedContent = extractedContent.substring(0, 8000) + '...'
  }
  
  return {
    content: extractedContent,
    title: title
  }
}

function buildSummaryPrompt(
  content: string, 
  title: string, 
  length: string, 
  focusTopics?: string[]
): string {
  const lengthInstructions = {
    brief: 'Create a brief summary (2-3 sentences, ~50-100 words)',
    medium: 'Create a medium-length summary (1-2 paragraphs, ~150-300 words)', 
    detailed: 'Create a detailed summary (2-3 paragraphs, ~300-500 words)'
  }
  
  const instruction = lengthInstructions[length as keyof typeof lengthInstructions] || lengthInstructions.medium
  
  const focusInstruction = focusTopics && focusTopics.length > 0 
    ? `Pay special attention to these topics: ${focusTopics.join(', ')}.` 
    : ''
  
  return `Please summarize the following web content. ${instruction}. ${focusInstruction}

Title: ${title}

Content: ${content}

Please respond with a JSON object in this exact format:
{
  "summary": "Your summary here",
  "key_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
}

Ensure the summary is accurate, well-structured, and captures the main ideas of the content.`
}