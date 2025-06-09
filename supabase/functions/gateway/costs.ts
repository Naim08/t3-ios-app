// Token cost mapping per 1K tokens (in credits)
export const TOKEN_COSTS = {
  // OpenAI Models
  'gpt-3.5-turbo': {
    input: 0.5,  // $0.0005 per 1K tokens
    output: 1.5, // $0.0015 per 1K tokens
  },
  'gpt-4o': {
    input: 2.5,  // $0.0025 per 1K tokens  
    output: 10,  // $0.01 per 1K tokens
  },
  'gpt-4': {
    input: 30,   // $0.03 per 1K tokens
    output: 60,  // $0.06 per 1K tokens
  },
  
  // Anthropic Models
  'claude-3-sonnet': {
    input: 3,    // $0.003 per 1K tokens
    output: 15,  // $0.015 per 1K tokens
  },
  'claude-3-haiku': {
    input: 0.25, // $0.00025 per 1K tokens
    output: 1.25, // $0.00125 per 1K tokens
  },
  
  // Google Models - Gemini
  'gemini-pro': {
    input: 0.5,   // Free tier pricing converted to credits
    output: 1.5,
  },
  'gemini-1.5-pro': {
    input: 3.5,   // $0.0035 per 1K tokens
    output: 10.5, // $0.0105 per 1K tokens
  },
  'gemini-1.5-flash': {
    input: 0.075, // $0.000075 per 1K tokens
    output: 0.3,  // $0.0003 per 1K tokens
  },
  'gemini-1.5-flash-8b': {
    input: 0.0375, // $0.0000375 per 1K tokens
    output: 0.15,  // $0.00015 per 1K tokens
  },
  'gemini-2.0-flash': {
    input: 0.075, // Same as 1.5-flash
    output: 0.3,
  },
  'gemini-2.0-flash-lite': {
    input: 0.0375, // Same as 1.5-flash-8b
    output: 0.15,
  },
  'gemini-2.5-flash-preview-05-20': {
    input: 0.075, // Preview pricing similar to flash
    output: 0.3,
  },
  'gemini-2.5-flash-preview': {
    input: 0.075, // Preview pricing similar to flash
    output: 0.3,
  },
  'gemini-2.5-pro-preview': {
    input: 3.5, // Similar to 1.5-pro
    output: 10.5,
  },
  'gemini-2.5-pro-preview-06-05': {
    input: 3.5, // Similar to 1.5-pro
    output: 10.5,
  },
  'text-embedding-004': {
    input: 0.01, // Very low cost for embeddings
    output: 0.01,
  },
  'gemini-embedding-exp-03-07': {
    input: 0.01, // Very low cost for embeddings
    output: 0.01,
  },
  'aqa': {
    input: 1.0, // Conservative estimate for QA model
    output: 2.0,
  },
  'gemma-3': {
    input: 0.05, // Very low cost for open source model
    output: 0.1,
  },
  'gemma-3n': {
    input: 0.025, // Even lower for compact model
    output: 0.05,
  },
  
  // Model aliases
  'gpt-3.5': {
    input: 0.5,
    output: 1.5,
  },
  'claude-sonnet': {
    input: 3,
    output: 15,
  },
  'gemini-flash': {
    input: 0.075,
    output: 0.3,
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
