/**
 * Model utility functions for classification and validation
 * This mirrors the backend logic in supabase/functions/gateway/providers.ts
 */

/**
 * Check if a model requires premium subscription
 * @param modelId - The model identifier
 * @returns true if the model is premium, false if free
 */
export function isModelPremium(modelId: string): boolean {
    return !getFreeModels().includes(modelId);
}

/**
 * Get the list of free models
 * @returns Array of free model IDs
 */
export function getFreeModels(): string[] {
  return [
    'gpt-3.5-turbo',
    'gpt-3.5',
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
  ];
}

/**
 * Check if a user can access a model based on their entitlements and token balance
 * @param modelId - The model identifier
 * @param remainingTokens - Number of tokens remaining
 * @param isSubscriber - Whether the user has a premium subscription
 * @param hasCustomKey - Whether the user has a custom API key
 * @returns true if the user can access the model
 */
export function canAccessModel(
  modelId: string,
  remainingTokens: number,
  isSubscriber: boolean,
  hasCustomKey: boolean
): boolean {
  const isPremium = isModelPremium(modelId);
  
  // For free models, check token balance
  if (!isPremium) {
    return remainingTokens > 0;
  }
  
  // For premium models, check subscription or custom key
  return isSubscriber || hasCustomKey;
}
