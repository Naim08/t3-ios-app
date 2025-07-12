export interface ModelOption {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  icon?: string;
  provider?: 'openai' | 'anthropic' | 'google';
  category?: 'fast' | 'balanced' | 'advanced' | Array<'fast' | 'balanced' | 'advanced'>;
  capabilities?: Array<'text' | 'audio-input' | 'audio-output' | 'image-input' | 'video-input' | 'image-output'>;
  audioModelType?: 'transcription' | 'tts' | 'multimodal';
  pricing?: {
    inputTokens?: number; // per million tokens
    outputTokens?: number; // per million tokens
    audioInput?: number; // per minute
    audioOutput?: number; // per minute
  };
}

export const AI_MODELS: ModelOption[] = [
  // === TEXT-ONLY MODELS ===
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient for everyday tasks',
    isPremium: false,
    provider: 'openai',
    category: 'fast',
    capabilities: ['text'],
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Latest model with enhanced reasoning',
    isPremium: true,
    provider: 'openai',
    category: 'advanced',
    capabilities: ['text'],
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Most capable OpenAI model',
    isPremium: true,
    provider: 'openai',
    category: 'advanced',
    capabilities: ['text'],
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Advanced reasoning and analysis',
    isPremium: true,
    provider: 'anthropic',
    category: 'advanced',
    capabilities: ['text'],
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast and efficient Claude model',
    isPremium: false,
    provider: 'anthropic',
    category: 'fast',
    capabilities: ['text'],
  },

  // === AUDIO-CAPABLE MODELS ===
  {
    id: 'gpt-4o-transcribe',
    name: 'GPT-4o Transcribe',
    description: 'Best quality speech-to-text transcription',
    isPremium: true,
    provider: 'openai',
    category: 'advanced',
    capabilities: ['text', 'audio-input'],
    audioModelType: 'transcription',
    icon: '🎤',
    pricing: {
      audioInput: 0.006, // $0.006 per minute
    },
  },
  {
    id: 'gpt-4o-mini-transcribe',
    name: 'GPT-4o Mini Transcribe',
    description: 'Fast and cost-effective speech-to-text',
    isPremium: true,
    provider: 'openai',
    category: 'fast',
    capabilities: ['text', 'audio-input'],
    audioModelType: 'transcription',
    icon: '🎤',
    pricing: {
      audioInput: 0.003, // $0.003 per minute
    },
  },
  {
    id: 'gpt-4o-mini-tts',
    name: 'GPT-4o Mini TTS',
    description: 'Customizable text-to-speech generation',
    isPremium: true,
    provider: 'openai',
    category: 'fast',
    capabilities: ['text', 'audio-output'],
    audioModelType: 'tts',
    icon: '🔊',
    pricing: {
      inputTokens: 0.60, // per million tokens
      audioOutput: 0.015, // $0.015 per minute
    },
  },

  // === MULTIMODAL MODELS ===
  {
    id: 'gemini-2.5-pro-audio',
    name: 'Gemini 2.5 Pro (Audio)',
    description: 'Native multimodal processing with audio, text, images, and video',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
    capabilities: ['text', 'audio-input', 'audio-output', 'image-input', 'video-input'],
    audioModelType: 'multimodal',
    icon: '🎭',
    pricing: {
      inputTokens: 1.25, // per million tokens (estimated)
      outputTokens: 5.00, // per million tokens (estimated)
      audioInput: 0.00125, // per minute (estimated)
      audioOutput: 0.00125, // per minute (estimated)
    },
  },
  {
    id: 'gemini-2.5-flash-audio',
    name: 'Gemini 2.5 Flash (Audio)',
    description: 'Fast multimodal processing with audio and visual capabilities',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
    capabilities: ['text', 'audio-input', 'audio-output', 'image-input'],
    audioModelType: 'multimodal',
    icon: '⚡',
    pricing: {
      inputTokens: 0.075, // per million tokens (estimated)
      outputTokens: 0.30, // per million tokens (estimated)
      audioInput: 0.00075, // per minute (estimated)
      audioOutput: 0.00075, // per minute (estimated)
    },
  },

  // === LEGACY AUDIO MODELS (for comparison) ===
  {
    id: 'whisper-1',
    name: 'Whisper v1',
    description: 'OpenAI\'s original speech-to-text model (legacy)',
    isPremium: true,
    provider: 'openai',
    category: 'balanced',
    capabilities: ['text', 'audio-input'],
    audioModelType: 'transcription',
    icon: '🎙️',
    pricing: {
      audioInput: 0.006, // $0.006 per minute
    },
  },

  // === EXISTING GEMINI MODELS (Updated with capabilities) ===
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Google\'s advanced multimodal model',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
    capabilities: ['text', 'image-input'],
  },
  {
    id: 'text-embedding-004',
    name: 'Text Embedding 004',
    description: 'Google\'s free text embedding model',
    isPremium: false,
    provider: 'google',
    category: 'fast',
    capabilities: ['text'],
  },
  {
    id: 'gemma-3',
    name: 'Gemma 3',
    description: 'Free open-source model by Google',
    isPremium: false,
    provider: 'google',
    category: 'fast',
    capabilities: ['text'],
  },
  {
    id: 'gemma-3n',
    name: 'Gemma 3n',
    description: 'Free compact model by Google',
    isPremium: false,
    provider: 'google',
    category: 'fast',
    capabilities: ['text'],
  },
  // Additional Gemini models (keeping them free as requested)
  {
    id: 'gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash Preview',
    description: 'Latest preview model with enhanced capabilities',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
    capabilities: ['text', 'image-input'],
  },
  {
    id: 'gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro Preview',
    description: 'Most advanced Gemini model preview',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
    capabilities: ['text', 'image-input'],
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Next-generation fast model with image generation',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
    capabilities: ['text', 'image-input'],
  },
  {
    id: 'gemini-2.0-flash-preview-image-generation',
    name: 'Gemini 2.0 Flash Image Generation',
    description: 'Specialized model for generating images alongside text responses',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
    capabilities: ['text', 'image-input', 'image-output'],
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    description: 'Lightweight version of Gemini 2.0 Flash',
    isPremium: false,
    provider: 'google',
    category: 'fast',
    capabilities: ['text'],
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Optimized for speed and efficiency',
    isPremium: false,
    provider: 'google',
    category: 'fast',
    capabilities: ['text', 'image-input'],
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    description: 'Compact model for quick responses',
    isPremium: false,
    provider: 'google',
    category: 'fast',
    capabilities: ['text'],
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Enhanced Gemini with larger context',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
    capabilities: ['text', 'image-input'],
  },
  // Additional Gemini models from official API
  {
    id: 'gemini-2.5-flash-preview-05-20',
    name: 'Gemini 2.5 Flash Preview (05-20)',
    description: 'Specific preview version of Gemini 2.5 Flash',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
    capabilities: ['text', 'image-input'],
  },
  {
    id: 'gemini-2.5-pro-preview-06-05',
    name: 'Gemini 2.5 Pro Preview (06-05)',
    description: 'Specific preview version of Gemini 2.5 Pro',
    isPremium: false,
    provider: 'google',
    category: 'advanced',
    capabilities: ['text', 'image-input'],
  },
  {
    id: 'gemini-embedding-exp-03-07',
    name: 'Gemini Embedding Experimental',
    description: 'Experimental embedding model',
    isPremium: false,
    provider: 'google',
    category: 'fast',
    capabilities: ['text'],
  },
  {
    id: 'aqa',
    name: 'Attributed QA',
    description: 'Attributed Question-Answering model',
    isPremium: false,
    provider: 'google',
    category: 'balanced',
    capabilities: ['text'],
  },
];

// Convenience functions
export const getFreeModels = (): string[] => {
  // Updated to match backend logic - use the function rather than model flags
  return AI_MODELS.map(model => model.id).filter(id => !isModelPremium(id));
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

// New audio-specific filtering functions
export const getAudioCapableModels = (): ModelOption[] => {
  return AI_MODELS.filter(model => 
    model.capabilities?.some(cap => cap.includes('audio'))
  );
};

export const getModelsByAudioCapability = (capability: 'audio-input' | 'audio-output'): ModelOption[] => {
  return AI_MODELS.filter(model => 
    model.capabilities?.includes(capability)
  );
};

export const getModelsByAudioType = (audioType: 'transcription' | 'tts' | 'multimodal'): ModelOption[] => {
  return AI_MODELS.filter(model => model.audioModelType === audioType);
};

export const getSpeechToTextModels = (): ModelOption[] => {
  return AI_MODELS.filter(model => 
    model.capabilities?.includes('audio-input') && 
    (model.audioModelType === 'transcription' || model.audioModelType === 'multimodal')
  );
};

export const getTextToSpeechModels = (): ModelOption[] => {
  return AI_MODELS.filter(model => 
    model.capabilities?.includes('audio-output') && 
    (model.audioModelType === 'tts' || model.audioModelType === 'multimodal')
  );
};

export const getMultimodalAudioModels = (): ModelOption[] => {
  return AI_MODELS.filter(model => model.audioModelType === 'multimodal');
};

// Image-specific filtering functions
export const getImageCapableModels = (): ModelOption[] => {
  return AI_MODELS.filter(model => 
    model.capabilities?.some(cap => cap.includes('image'))
  );
};

export const getImageInputModels = (): ModelOption[] => {
  return AI_MODELS.filter(model => 
    model.capabilities?.includes('image-input')
  );
};

export const getImageOutputModels = (): ModelOption[] => {
  return AI_MODELS.filter(model => 
    model.capabilities?.includes('image-output')
  );
};

export const getImageGenerationModels = (): ModelOption[] => {
  return getImageOutputModels(); // Alias for clarity
};

export const isModelPremium = (modelId: string): boolean => {
  // Resolve aliases first
  const resolvedId = resolveModelId(modelId);
  
  // Updated to match backend logic from providers.ts
  const freeModels = [
    'gpt-3.5-turbo', 
    'gpt-3.5', 
    'claude-3-haiku',
    'gemini-pro', 
    'gemini-1.5-pro', 
    'gemini-flash', 
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.5-flash-preview',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-pro-preview',
    'gemini-2.5-pro-preview-06-05',
    'gemini-2.5-pro-audio',
    'gemini-2.5-flash-audio',
    'text-embedding-004',
    'gemini-embedding-exp-03-07',
    'aqa',
    'gemma-3',
    'gemma-3n'
  ];
  return !freeModels.includes(resolvedId);
};

// Model aliases for compatibility with backend
export const MODEL_ALIASES: Record<string, string> = {
  'gpt-3.5': 'gpt-3.5-turbo',
  'claude-sonnet': 'claude-3-sonnet',
  'gemini-flash': 'gemini-1.5-flash',
};

// Resolve model ID with alias support
export const resolveModelId = (modelId: string): string => {
  return MODEL_ALIASES[modelId] || modelId;
};

// Default models for different use cases
export const DEFAULT_MODELS = {
  FREE: 'gpt-3.5-turbo',
  PREMIUM: 'gpt-4o',
  FAST: 'gemini-1.5-flash',
  BALANCED: 'gemini-pro',
  ADVANCED: 'claude-3-sonnet',
} as const;

export type DefaultModelType = keyof typeof DEFAULT_MODELS;

// Get all supported model IDs (including aliases)
export const getSupportedModelIds = (): string[] => {
  const modelIds = AI_MODELS.map(model => model.id);
  const aliases = Object.keys(MODEL_ALIASES);
  return [...modelIds, ...aliases];
};

// Helper function to validate if a model is supported
export const isModelSupported = (modelId: string): boolean => {
  return getSupportedModelIds().includes(modelId);
};