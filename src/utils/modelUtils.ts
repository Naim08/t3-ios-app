import { 
  AI_MODELS, 
  ModelOption, 
  getFreeModels as getFreModelsFromConfig, 
  getPremiumModels, 
  getModelById, 
  isModelPremium as isModelPremiumFromConfig 
} from '../config/models';

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
    return isModelPremiumFromConfig(modelId);
}

/**
 * Get the list of free models
 * @returns Array of free model IDs
 */
export function getFreeModels(): string[] {
  return getFreModelsFromConfig();
}

/**
 * Get all available models
 * @returns Array of all model options
 */
export function getAllModels(): ModelOption[] {
  return AI_MODELS;
}

/**
 * Get model details by ID
 * @param modelId - The model identifier
 * @returns Model option object or undefined if not found
 */
export function getModelDetails(modelId: string): ModelOption | undefined {
  return getModelById(modelId);
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
