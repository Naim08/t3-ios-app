export interface ModelOption {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  icon?: string;
  provider?: 'openai' | 'anthropic' | 'google';
  category?: 'fast' | 'balanced' | 'advanced';
}

export const AI_MODELS: ModelOption[] = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient for everyday tasks',
    isPremium: false,
    provider: 'openai',
    category: 'fast',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Latest model with enhanced reasoning',
    isPremium: true,
    provider: 'openai',
    category: 'advanced',
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Advanced reasoning and analysis',
    isPremium: true,
    provider: 'anthropic',
    category: 'advanced',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Google\'s advanced multimodal model',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Enhanced Gemini with larger context',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
  },
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    description: 'Fast and lightweight responses',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Optimized for speed and efficiency',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    description: 'Compact model for quick responses',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Next-generation fast model',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    description: 'Ultra-lightweight for instant responses',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
];

// Convenience functions
export const getFreeModels = (): string[] => {
  return AI_MODELS.filter(model => !model.isPremium).map(model => model.id);
};

export const getPremiumModels = (): string[] => {
  return AI_MODELS.filter(model => model.isPremium).map(model => model.id);
};

export const getModelById = (id: string): ModelOption | undefined => {
  return AI_MODELS.find(model => model.id === id);
};

export const getModelsByProvider = (provider: string): ModelOption[] => {
  return AI_MODELS.filter(model => model.provider === provider);
};

export const getModelsByCategory = (category: string): ModelOption[] => {
  return AI_MODELS.filter(model => model.category === category);
};

export const isModelPremium = (modelId: string): boolean => {
  const model = getModelById(modelId);
  return model?.isPremium ?? false;
};

// Default models for different use cases
export const DEFAULT_MODELS = {
  FREE: 'gpt-3.5-turbo',
  PREMIUM: 'gpt-4o',
  FAST: 'gemini-flash',
  BALANCED: 'gemini-pro',
  ADVANCED: 'claude-3-sonnet',
} as const;

export type DefaultModelType = keyof typeof DEFAULT_MODELS;