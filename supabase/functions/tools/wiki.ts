// Wikipedia search tool for function calling

export interface WikiRequest {
  query: string
  limit?: number
}

export interface WikiResult {
  title: string
  extract: string
  url: string
  thumbnail?: string
}

export interface WikiResponse {
  results: WikiResult[]
  query: string
  total_results: number
}

export async function searchWikipedia(query: string, limit: number = 3): Promise<{ success: boolean; data: WikiResponse; message: string }> {
  try {
    // First try to get the exact page with full content
    const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages|info&exintro=0&explaintext=1&exsectionformat=plain&inprop=url&piprop=original|thumbnail&pithumbsize=500&titles=${encodeURIComponent(query)}`
    
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'PocketT3-Tools/1.0 (https://github.com/your-repo/pocket-t3)'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const pages = data.query?.pages || {}
      const pageId = Object.keys(pages)[0]
      
      if (pageId && pageId !== '-1') {
        const page = pages[pageId]
        
        // Get full content and create a comprehensive summary
        let fullText = page.extract || ''
        let summary = ''
        
        // Extract first few paragraphs for summary
        const paragraphs = fullText.split('\n\n').filter(p => p.trim().length > 0)
        const introSection = paragraphs.slice(0, 3).join('\n\n')
        
        // Find key sections
        const sections = fullText.split(/\n\n\n/).map(s => s.trim()).filter(s => s.length > 0)
        const sectionSummaries = []
        
        for (const section of sections.slice(0, 5)) { // Get first 5 sections
          const lines = section.split('\n')
          if (lines.length > 0) {
            const heading = lines[0]
            const content = lines.slice(1).join(' ').substring(0, 200) + '...'
            if (heading && content && content.length > 10) {
              sectionSummaries.push(`**${heading}**: ${content}`)
            }
          }
        }
        
        // Build comprehensive summary
        summary = introSection
        if (sectionSummaries.length > 0) {
          summary += '\n\n**Key Sections:**\n' + sectionSummaries.join('\n')
        }
        
        // Add article stats
        const wordCount = fullText.split(/\s+/).length
        summary += `\n\n*Article contains approximately ${wordCount} words across ${sections.length} sections.*`
        
        const result: WikiResult = {
          title: page.title,
          extract: summary,
          url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
          thumbnail: page.original?.source || page.thumbnail?.source
        }

        const wikiResponse: WikiResponse = {
          results: [result],
          query,
          total_results: 1
        }
        
        return {
          success: true,
          data: wikiResponse,
          message: `Found comprehensive Wikipedia article for "${query}"`
        }
      }
    }

    // If direct page lookup fails, try search API
    const searchApiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&srprop=snippet`
    
    const searchResponse = await fetch(searchApiUrl, {
      headers: {
        'User-Agent': 'PocketT3-Tools/1.0 (https://github.com/your-repo/pocket-t3)'
      }
    })

    if (!searchResponse.ok) {
      throw new Error(`Wikipedia API error: ${searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json()
    const searchResults = searchData.query?.search || []

    // Get detailed info for the first few results
    const results: WikiResult[] = []
    
    for (const result of searchResults.slice(0, limit)) {
      try {
        const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title)}`
        const pageResponse = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'PocketT3-Tools/1.0 (https://github.com/your-repo/pocket-t3)'
          }
        })

        if (pageResponse.ok) {
          const pageData = await pageResponse.json()
          results.push({
            title: pageData.title,
            extract: pageData.extract || result.snippet || 'No summary available',
            url: pageData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
            thumbnail: pageData.thumbnail?.source
          })
        } else {
          // Fallback to search snippet
          results.push({
            title: result.title,
            extract: result.snippet || 'No summary available',
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`
          })
        }
      } catch (error) {
        console.error(`Error fetching page ${result.title}:`, error)
        // Add basic result even if detailed fetch fails
        results.push({
          title: result.title,
          extract: result.snippet || 'No summary available',
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`
        })
      }
    }

    const wikiResponse: WikiResponse = {
      results,
      query,
      total_results: searchData.query?.searchinfo?.totalhits || results.length
    }

    return {
      success: true,
      data: wikiResponse,
      message: `Found ${results.length} Wikipedia results for "${query}"`
    }

  } catch (error) {
    console.error('Wikipedia search error:', error)
    const errorResponse: WikiResponse = {
      results: [],
      query,
      total_results: 0
    }
    
    return {
      success: false,
      data: errorResponse,
      message: `Failed to search Wikipedia for "${query}"`
    }
  }
}