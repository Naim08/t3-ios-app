import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';

// Import logo assets
const PROVIDER_LOGOS = {
  openai: require('../../assets/chatgpt-vector-logo-seeklogo/chatgpt-seeklogo.png'),
  anthropic: require('../../assets/claude-vector-logo-seeklogo/claude-seeklogo.png'),
  google: require('../../assets/gemini-icon-vector-logo-seeklogo/gemini-icon-seeklogo.png'),
  deepseek: require('../../assets/deepseek-ai-icon-vector-logo-seeklogo/deepseek-ai-icon-seeklogo.png'),
} as const;

export type ProviderType = keyof typeof PROVIDER_LOGOS;

interface ModelProviderLogoProps {
  provider: ProviderType;
  size?: number;
  style?: ViewStyle;
}

export const ModelProviderLogo: React.FC<ModelProviderLogoProps> = ({
  provider,
  size = 20,
  style,
}) => {
  const { theme, colorScheme } = useTheme();

  const logoSource = PROVIDER_LOGOS[provider];

  if (!logoSource) {
    // Fallback for unknown providers
    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.gray['300'],
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.logoContainer,
        {
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <Image
        source={logoSource}
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            // Apply white tint to OpenAI logo in dark mode since it's black
            tintColor: colorScheme === 'dark' && provider === 'openai' 
              ? '#FFFFFF' 
              : undefined,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

// Utility function to get provider from model ID
export const getProviderFromModelId = (modelId: string | undefined | null): ProviderType => {
  if (!modelId) {
    return 'openai'; // Default fallback for undefined/null
  }
  
  const lowerModelId = modelId.toLowerCase();
  
  if (lowerModelId.includes('gpt') || lowerModelId.includes('openai')) {
    return 'openai';
  }
  if (lowerModelId.includes('claude') || lowerModelId.includes('anthropic')) {
    return 'anthropic';
  }
  if (lowerModelId.includes('gemini') || lowerModelId.includes('google')) {
    return 'google';
  }
  if (lowerModelId.includes('deepseek')) {
    return 'deepseek';
  }
  
  // Default fallback
  return 'openai';
};

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    // Image styles are handled via props
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});