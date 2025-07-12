// Token cost mapping per 1K tokens (in credits) - Updated January 2025 with 50% overhead markup
export const TOKEN_COSTS = {
  // OpenAI Models - Updated pricing with overhead
  'gpt-3.5-turbo': {
    input: 0.75,  // $0.0005 per 1K tokens + 50% overhead
    output: 2.25, // $0.0015 per 1K tokens + 50% overhead
  },
  'gpt-4o': {
    input: 7.5,   // $0.005 per 1K tokens + 50% overhead  
    output: 22.5, // $0.015 per 1K tokens + 50% overhead
  },
  'gpt-4': {
    input: 45,    // $0.03 per 1K tokens + 50% overhead
    output: 90,   // $0.06 per 1K tokens + 50% overhead
  },
  
  // Anthropic Models - Updated pricing with overhead
  'claude-3-sonnet': {
    input: 4.5,   // $0.003 per 1K tokens + 50% overhead
    output: 22.5, // $0.015 per 1K tokens + 50% overhead
  },
  'claude-3-haiku': {
    input: 1.2,   // $0.0008 per 1K tokens + 50% overhead  
    output: 6,    // $0.004 per 1K tokens + 50% overhead
  },
  
  // Google Models - Gemini - Updated pricing with overhead
  'gemini-pro': {
    input: 0.5,   // Free tier pricing converted to credits (legacy)
    output: 1.5,
  },
  'gemini-1.5-pro': {
    input: 1.875, // $0.00125 per 1K tokens + 50% overhead (≤128k tokens)
    output: 7.5,  // $0.005 per 1K tokens + 50% overhead
  },
  'gemini-1.5-flash': {
    input: 0.1125, // $0.000075 per 1K tokens + 50% overhead
    output: 0.45,   // $0.0003 per 1K tokens + 50% overhead
  },
  'gemini-1.5-flash-8b': {
    input: 0.1125, // Same as 1.5-flash + 50% overhead
    output: 0.45,
  },
  'gemini-2.0-flash': {
    input: 0.225,  // $0.00015 per 1K tokens + 50% overhead
    output: 0.9,   // $0.0006 per 1K tokens + 50% overhead
  },
  'gemini-2.0-flash-lite': {
    input: 0.1125, // $0.000075 per 1K tokens + 50% overhead
    output: 0.45,   // $0.0003 per 1K tokens + 50% overhead
  },
  'gemini-2.0-flash-preview-image-generation': {
    input: 0.225,  // Same as 2.0-flash + 50% overhead
    output: 0.9,   // Plus image generation capability
  },
  'gemini-2.5-flash-preview-05-20': {
    input: 0.1125, // Preview pricing similar to flash + 50% overhead
    output: 0.45,
  },
  'gemini-2.5-flash-preview': {
    input: 0.1125, // Preview pricing similar to flash + 50% overhead
    output: 0.45,
  },
  'gemini-2.5-pro-preview': {
    input: 1.875, // Similar to 1.5-pro + 50% overhead
    output: 7.5,
  },
  'gemini-2.5-pro-preview-06-05': {
    input: 1.875, // Similar to 1.5-pro + 50% overhead
    output: 7.5,
  },
  'text-embedding-004': {
    input: 0.015, // Very low cost for embeddings + 50% overhead
    output: 0.015,
  },
  'gemini-embedding-exp-03-07': {
    input: 0.015, // Very low cost for embeddings + 50% overhead
    output: 0.015,
  },
  'aqa': {
    input: 1.5, // Conservative estimate for QA model + 50% overhead
    output: 3.0,
  },
  'gemma-3': {
    input: 0.075, // Very low cost for open source model + 50% overhead
    output: 0.15,
  },
  'gemma-3n': {
    input: 0.0375, // Even lower for compact model + 50% overhead
    output: 0.075,
  },
  
  // Model aliases - Updated with overhead
  'gpt-3.5': {
    input: 0.75,
    output: 2.25,
  },
  'claude-sonnet': {
    input: 4.5,
    output: 22.5,
  },
  'gemini-flash': {
    input: 0.1125,
    output: 0.45,
  },
} as const;

export type ModelId = keyof typeof TOKEN_COSTS;

// Improved token estimation - Claude/GPT tokenizers average ~4 chars per token
// Gemini uses SentencePiece which can be more efficient
export function estimateTokens(text: string, modelId: string): number {
  if (!text) return 0;
  
  // Different models have different tokenization patterns
  const charsPerToken = getCharsPerToken(modelId);
  return Math.ceil(text.length / charsPerToken);
}

function getCharsPerToken(modelId: string): number {
  // Gemini models tend to be more efficient with tokenization
  if (modelId.startsWith('gemini')) {
    return 3.5; // More efficient tokenization
  }
  
  // Claude and GPT models
  return 4; // Standard approximation
}

export function calculateTokenCost(modelId: string, promptTokens: number, completionTokens: number): number {
  const costs = TOKEN_COSTS[modelId as ModelId];
  if (!costs) {
    console.warn(`Unknown model ${modelId}, using default pricing`);
    // Default cost for unknown models - conservative estimate
    return Math.ceil((promptTokens + completionTokens) / 1000 * 5);
  }
  
  const inputCost = (promptTokens / 1000) * costs.input;
  const outputCost = (completionTokens / 1000) * costs.output;
  
  // Always round up to ensure we don't undercharge
  return Math.ceil(inputCost + outputCost);
}

// Calculate cost for a streaming response where we know the prompt but are estimating completion
export function calculateStreamingCost(modelId: string, promptTokens: number, completionText: string): number {
  const completionTokens = estimateTokens(completionText, modelId);
  return calculateTokenCost(modelId, promptTokens, completionTokens);
}

// Pre-calculate cost estimate for a request
export function estimateRequestCost(modelId: string, prompt: string, estimatedResponseLength = 500): number {
  const promptTokens = estimateTokens(prompt, modelId);
  const estimatedCompletionTokens = estimateTokens('x'.repeat(estimatedResponseLength), modelId);
  return calculateTokenCost(modelId, promptTokens, estimatedCompletionTokens);
}
