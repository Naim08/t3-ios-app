// LLM Provider Configuration for LangChain
export interface ProviderConfig {
  baseURL?: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  streaming: boolean;
}

export function getProviderConfig(modelId: string, hasCustomKey: boolean, customApiKey?: string): ProviderConfig | null {
  const baseConfig = {
    maxTokens: 2000,
    temperature: 0.7,
    streaming: true,
  };

  switch (modelId) {
    case 'gpt-3.5-turbo':
    case 'gpt-3.5':
      return {
        ...baseConfig,
        baseURL: Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
        apiKey: hasCustomKey && customApiKey ? customApiKey : Deno.env.get('OPENAI_API_KEY_SERVER') || '',
        model: 'gpt-3.5-turbo',
      };
      
    case 'gpt-4o':
      return {
        ...baseConfig,
        baseURL: Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
        apiKey: hasCustomKey && customApiKey ? customApiKey : Deno.env.get('OPENAI_API_KEY_SERVER') || '',
        model: 'gpt-4o',
        maxTokens: 4000,
      };
      
    case 'gpt-4':
      return {
        ...baseConfig,
        baseURL: Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
        apiKey: hasCustomKey && customApiKey ? customApiKey : Deno.env.get('OPENAI_API_KEY_SERVER') || '',
        model: 'gpt-4',
        maxTokens: 8000,
      };

    case 'claude-3-sonnet':
    case 'claude-sonnet':
      return {
        ...baseConfig,
        baseURL: 'https://api.anthropic.com',
        apiKey: hasCustomKey && customApiKey ? customApiKey : Deno.env.get('ANTHROPIC_API_KEY_SERVER') || '',
        model: 'claude-3-sonnet-20240229',
        maxTokens: 4000,
      };
      
    case 'claude-3-haiku':
      return {
        ...baseConfig,
        baseURL: 'https://api.anthropic.com',
        apiKey: hasCustomKey && customApiKey ? customApiKey : Deno.env.get('ANTHROPIC_API_KEY_SERVER') || '',
        model: 'claude-3-haiku-20240307',
      };

    case 'gemini-pro':
      const googleProApiKey = hasCustomKey && customApiKey ? customApiKey : Deno.env.get('GOOGLE_API_KEY_SERVER');
      
      if (!googleProApiKey) {
        throw new Error('Google API key is required for Gemini models. Please set GOOGLE_API_KEY_SERVER environment variable or provide a custom API key.');
      }
      
      return {
        ...baseConfig,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: googleProApiKey,
        model: 'gemini-2.0-flash', // Default to Gemini 2.0 Flash
      };

    case 'gemini-1.5-pro':
      const google15ProApiKey = hasCustomKey && customApiKey ? customApiKey : Deno.env.get('GOOGLE_API_KEY_SERVER');
      
      if (!google15ProApiKey) {
        throw new Error('Google API key is required for Gemini models. Please set GOOGLE_API_KEY_SERVER environment variable or provide a custom API key.');
      }
      
      return {
        ...baseConfig,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: google15ProApiKey,
        model: 'gemini-1.5-pro',
      };
      
    case 'gemini-flash':
    case 'gemini-1.5-flash':
      const googleFlashApiKey = hasCustomKey && customApiKey ? customApiKey : Deno.env.get('GOOGLE_API_KEY_SERVER');
      
      if (!googleFlashApiKey) {
        throw new Error('Google API key is required for Gemini models. Please set GOOGLE_API_KEY_SERVER environment variable or provide a custom API key.');
      }
      
      return {
        ...baseConfig,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: googleFlashApiKey,
        model: 'gemini-1.5-flash',
      };

    case 'gemini-1.5-flash-8b':
      const googleFlash8bApiKey = hasCustomKey && customApiKey ? customApiKey : Deno.env.get('GOOGLE_API_KEY_SERVER');
      
      if (!googleFlash8bApiKey) {
        throw new Error('Google API key is required for Gemini models. Please set GOOGLE_API_KEY_SERVER environment variable or provide a custom API key.');
      }
      
      return {
        ...baseConfig,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: googleFlash8bApiKey,
        model: 'gemini-1.5-flash-8b',
      };

    case 'gemini-2.0-flash':
      const google2FlashApiKey = hasCustomKey && customApiKey ? customApiKey : Deno.env.get('GOOGLE_API_KEY_SERVER');
      
      if (!google2FlashApiKey) {
        throw new Error('Google API key is required for Gemini models. Please set GOOGLE_API_KEY_SERVER environment variable or provide a custom API key.');
      }
      
      return {
        ...baseConfig,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: google2FlashApiKey,
        model: 'gemini-2.0-flash',
      };

    case 'gemini-2.0-flash-lite':
      const google2FlashLiteApiKey = hasCustomKey && customApiKey ? customApiKey : Deno.env.get('GOOGLE_API_KEY_SERVER');
      
      if (!google2FlashLiteApiKey) {
        throw new Error('Google API key is required for Gemini models. Please set GOOGLE_API_KEY_SERVER environment variable or provide a custom API key.');
      }
      
      return {
        ...baseConfig,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: google2FlashLiteApiKey,
        model: 'gemini-2.0-flash-lite',
      };

    case 'gemini-2.5-flash-preview-05-20':
      const google25FlashApiKey = hasCustomKey && customApiKey ? customApiKey : Deno.env.get('GOOGLE_API_KEY_SERVER');
      
      if (!google25FlashApiKey) {
        throw new Error('Google API key is required for Gemini models. Please set GOOGLE_API_KEY_SERVER environment variable or provide a custom API key.');
      }
      
      return {
        ...baseConfig,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: google25FlashApiKey,
        model: 'gemini-2.5-flash-preview-05-20',
      };

    default:
      return null;
  }
}

export function isModelPremium(modelId: string): boolean {
  const freeModels = [
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
  return !freeModels.includes(modelId);
}
