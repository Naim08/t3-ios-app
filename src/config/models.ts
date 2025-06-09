export interface ModelOption {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  icon?: string;
  provider?: 'openai' | 'anthropic' | 'google';
  category?: 'fast' | 'balanced' | 'advanced' | Array<'fast' | 'balanced' | 'advanced'>;
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
  // Free Gemini models
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Google\'s advanced multimodal model',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
  },
  {
    id: 'text-embedding-004',
    name: 'Text Embedding 004',
    description: 'Google\'s free text embedding model',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
  {
    id: 'gemma-3',
    name: 'Gemma 3',
    description: 'Free open-source model by Google',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
  {
    id: 'gemma-3n',
    name: 'Gemma 3n',
    description: 'Free compact model by Google',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
  // Additional Gemini models (keeping them free as requested)
  {
    id: 'gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash Preview',
    description: 'Latest preview model with enhanced capabilities',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
  },
  {
    id: 'gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro Preview',
    description: 'Most advanced Gemini model preview',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Next-generation fast model with image generation',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    description: 'Lightweight version of Gemini 2.0 Flash',
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
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Enhanced Gemini with larger context',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
  },
  // Additional Gemini models from official API
  {
    id: 'gemini-2.5-flash-preview-05-20',
    name: 'Gemini 2.5 Flash Preview (05-20)',
    description: 'Specific preview version of Gemini 2.5 Flash',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
  },
  {
    id: 'gemini-2.5-pro-preview-06-05',
    name: 'Gemini 2.5 Pro Preview (06-05)',
    description: 'Specific preview version of Gemini 2.5 Pro',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
  },
  {
    id: 'gemini-embedding-exp-03-07',
    name: 'Gemini Embedding Experimental',
    description: 'Experimental embedding model',
    isPremium: false,
    provider: 'google',
    category: 'fast',
  },
  {
    id: 'aqa',
    name: 'Attributed QA',
    description: 'Attributed Question-Answering model',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
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
  return AI_MODELS.filter(model => {
    if (Array.isArray(model.category)) {
      return model.category.includes(category as 'fast' | 'balanced' | 'advanced');
    }
    return model.category === category;
  });
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