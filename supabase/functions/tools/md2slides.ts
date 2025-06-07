// MD2Slides tool using Pandoc Cloud Run (Premium only)

export interface MD2SlidesRequest {
  markdown_content: string
  output_format: 'reveal' | 'beamer' | 'pptx' | 'html5'
  theme?: string
  slide_level?: number
}

export interface MD2SlidesResponse {
  slide_url: string
  preview_url: string
  download_url: string
  format: string
  theme: string
  slide_count: number
  processing_time: number
}

export async function convertMarkdownToSlides(
  requestData: MD2SlidesRequest
): Promise<{ success: boolean; data: MD2SlidesResponse; message: string }> {
  const PANDOC_SERVICE_URL = Deno.env.get('PANDOC_SERVICE_URL')
  const PANDOC_API_KEY = Deno.env.get('PANDOC_API_KEY')
  
  if (!PANDOC_SERVICE_URL || !PANDOC_API_KEY) {
    return {
      success: false,
      data: {} as MD2SlidesResponse,
      message: 'Pandoc service configuration not available'
    }
  }

  try {
    const {
      markdown_content,
      output_format = 'reveal',
      theme = 'default',
      slide_level = 2
    } = requestData

    const startTime = Date.now()

    // Validate markdown content
    if (!markdown_content || markdown_content.trim().length === 0) {
      throw new Error('Markdown content is required')
    }

    // Prepare the conversion request
    const conversionRequest = {
      input: markdown_content,
      input_format: 'markdown',
      output_format: output_format,
      options: {
        slide_level: slide_level,
        theme: theme,
        standalone: true,
        self_contained: true
      }
    }

    // Call Pandoc Cloud Run service
    const response = await fetch(`${PANDOC_SERVICE_URL}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PANDOC_API_KEY}`,
        'X-Service-Name': 'pocket-t3-md2slides'
      },
      body: JSON.stringify(conversionRequest)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Pandoc service error (${response.status}): ${errorData}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Conversion failed')
    }

    const processingTime = Date.now() - startTime

    // Generate URLs (in a real implementation, these would be actual file URLs)
    const sessionId = `slides_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const baseUrl = `${PANDOC_SERVICE_URL}/files/${sessionId}`
    
    // Estimate slide count from markdown headers
    const slideCount = estimateSlideCount(markdown_content, slide_level)

    const md2slidesResponse: MD2SlidesResponse = {
      slide_url: `${baseUrl}/presentation.${getFileExtension(output_format)}`,
      preview_url: `${baseUrl}/preview.html`,
      download_url: `${baseUrl}/download.${getFileExtension(output_format)}`,
      format: output_format,
      theme: theme,
      slide_count: slideCount,
      processing_time: processingTime
    }

    return {
      success: true,
      data: md2slidesResponse,
      message: `Successfully converted markdown to ${output_format} slides with ${slideCount} slides`
    }

  } catch (error) {
    console.error('MD2Slides conversion error:', error)
    return {
      success: false,
      data: {} as MD2SlidesResponse,
      message: `Failed to convert markdown to slides: ${(error as Error).message}`
    }
  }
}

function getFileExtension(format: string): string {
  const extensions: Record<string, string> = {
    'reveal': 'html',
    'beamer': 'pdf',
    'pptx': 'pptx',
    'html5': 'html'
  }
  return extensions[format] || 'html'
}

function estimateSlideCount(markdown: string, slideLevel: number): number {
  // Count headers at the specified slide level and above
  const lines = markdown.split('\n')
  let slideCount = 1 // Start with 1 slide
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      const headerLevel = (trimmed.match(/^#+/) || [''])[0].length
      if (headerLevel <= slideLevel) {
        slideCount++
      }
    }
  }
  
  return Math.max(slideCount, 1)
}

// Alternative implementation using local Pandoc (fallback)
async function convertWithLocalPandoc(
  markdown: string,
  format: string,
  theme: string,
  slideLevel: number
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    // This would require Pandoc to be installed in the container
    // For Cloud Run, you'd install Pandoc in the Docker image
    
    const pandocArgs = [
      '--from', 'markdown',
      '--to', format,
      '--slide-level', slideLevel.toString(),
      '--standalone'
    ]
    
    if (format === 'reveal') {
      pandocArgs.push('--variable', `theme:${theme}`)
      pandocArgs.push('--variable', 'transition:slide')
    }
    
    // In a real implementation, you'd use Deno's subprocess API
    // const command = new Deno.Command('pandoc', { args: pandocArgs })
    // const { code, stdout, stderr } = await command.output()
    
    // Mock successful conversion for demonstration
    const mockOutput = generateMockSlideOutput(markdown, format, theme)
    
    return {
      success: true,
      output: mockOutput
    }
    
  } catch (error) {
    return {
      success: false,
      output: '',
      error: (error as Error).message
    }
  }
}

function generateMockSlideOutput(markdown: string, format: string, theme: string): string {
  // Generate a mock slide output based on the format
  switch (format) {
    case 'reveal':
      return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/theme/${theme}.css">
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${convertMarkdownToRevealSlides(markdown)}
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.js"></script>
    <script>Reveal.initialize();</script>
</body>
</html>`
    
    case 'html5':
      return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Slides</title>
    <style>
        .slide { page-break-after: always; padding: 2rem; }
        h1, h2, h3 { color: #333; }
    </style>
</head>
<body>
    ${convertMarkdownToHTML5Slides(markdown)}
</body>
</html>`
    
    default:
      return markdown // Fallback to original markdown
  }
}

function convertMarkdownToRevealSlides(markdown: string): string {
  // Simple markdown to Reveal.js conversion
  const lines = markdown.split('\n')
  let slides = ''
  let currentSlide = ''
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSlide) {
        slides += `<section>${currentSlide}</section>\n`
      }
      currentSlide = `<h2>${line.substring(3)}</h2>\n`
    } else if (line.startsWith('# ')) {
      if (currentSlide) {
        slides += `<section>${currentSlide}</section>\n`
      }
      currentSlide = `<h1>${line.substring(2)}</h1>\n`
    } else {
      currentSlide += line + '\n'
    }
  }
  
  if (currentSlide) {
    slides += `<section>${currentSlide}</section>\n`
  }
  
  return slides
}

function convertMarkdownToHTML5Slides(markdown: string): string {
  // Simple markdown to HTML5 slides conversion
  const lines = markdown.split('\n')
  let slides = ''
  let currentSlide = ''
  
  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('# ')) {
      if (currentSlide) {
        slides += `<div class="slide">${currentSlide}</div>\n`
      }
      const level = line.startsWith('## ') ? 2 : 1
      const title = line.substring(level + 1)
      currentSlide = `<h${level}>${title}</h${level}>\n`
    } else {
      currentSlide += `<p>${line}</p>\n`
    }
  }
  
  if (currentSlide) {
    slides += `<div class="slide">${currentSlide}</div>\n`
  }
  
  return slides
}