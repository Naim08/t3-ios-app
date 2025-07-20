import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, useColorScheme } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Typography } from '../ui/atoms';
import { useTooltipPortal } from './TooltipPortal';

// Define capability types based on the model configuration
export type ModelCapability = 
  | 'text' 
  | 'audio-input' 
  | 'audio-output' 
  | 'image-input' 
  | 'video-input' 
  | 'image-output';

// Capability icon mapping with emojis (for React Native compatibility)
const CAPABILITY_ICONS: Record<ModelCapability, string> = {
  'text': '📝',
  'audio-input': '🎤',
  'audio-output': '🔊',
  'image-input': '🖼️',
  'video-input': '🎥',
  'image-output': '🎨',
};

// Modern tooltip descriptions with better context
const CAPABILITY_TOOLTIPS: Record<ModelCapability, string> = {
  'text': 'Chat • Text conversations',
  'audio-input': 'Listen • Understands speech',
  'audio-output': 'Speak • Generates voice',
  'image-input': 'See • Analyzes images',
  'video-input': 'Watch • Processes video',
  'image-output': 'Create • Generates images',
};

interface CapabilityIconProps {
  capability: ModelCapability;
  size?: number;
  style?: ViewStyle;
  showTooltip?: boolean;
}

export const CapabilityIcon: React.FC<CapabilityIconProps> = ({
  capability,
  size = 16,
  style,
  showTooltip = true,
}) => {
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const { showTooltip: showPortalTooltip } = useTooltipPortal();
  const iconRef = useRef<View>(null);

  const handlePress = () => {
    if (!showTooltip) return;
    
    if (iconRef.current) {
      iconRef.current.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
        showPortalTooltip({
          content: CAPABILITY_TOOLTIPS[capability],
          x: pageX + width / 2, // Center of icon
          y: pageY, // Top of icon
          iconSize: size + 6, // Icon container size
        });
      });
    }
  };

  return (
    <TouchableOpacity
      ref={iconRef}
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.iconContainer,
        {
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.15)' 
            : theme.colors.brand['500'] + '15',
        },
        style,
      ]}
      accessibilityLabel={CAPABILITY_TOOLTIPS[capability]}
      accessibilityRole="button"
      accessibilityHint="Tap for details"
    >
      <Typography 
        variant="caption" 
        style={{ 
          fontSize: size * 0.75,
          lineHeight: size,
        }}
      >
        {CAPABILITY_ICONS[capability]}
      </Typography>
    </TouchableOpacity>
  );
};

interface ModelCapabilityIconsProps {
  capabilities: ModelCapability[];
  iconSize?: number;
  maxIcons?: number;
  style?: ViewStyle;
  spacing?: number;
}

export const ModelCapabilityIcons: React.FC<ModelCapabilityIconsProps> = ({
  capabilities = [],
  iconSize = 16,
  maxIcons = 4,
  style,
  spacing = 4,
}) => {
  const { theme } = useTheme();

  // Filter out 'text' capability as it's assumed for all models
  const visibleCapabilities = capabilities.filter(cap => cap !== 'text');
  
  // Limit the number of icons shown
  const displayCapabilities = visibleCapabilities.slice(0, maxIcons);
  const hasMoreCapabilities = visibleCapabilities.length > maxIcons;

  if (displayCapabilities.length === 0) {
    return null;
  }

  return (
    <View 
      style={[
        styles.iconsContainer,
        { gap: spacing, overflow: 'visible' },
        style,
      ]}
    >
      {displayCapabilities.map((capability) => (
        <CapabilityIcon
          key={capability}
          capability={capability}
          size={iconSize}
        />
      ))}
      
      {hasMoreCapabilities && (
        <View
          style={[
            styles.moreIndicator,
            {
              width: iconSize + 6,
              height: iconSize + 6,
              borderRadius: (iconSize + 6) / 2,
              backgroundColor: theme.colors.gray['400'] + '20',
            },
          ]}
        >
          <Typography 
            variant="caption" 
            style={{ 
              fontSize: iconSize * 0.5,
              color: theme.colors.textSecondary,
            }}
          >
            +{visibleCapabilities.length - maxIcons}
          </Typography>
        </View>
      )}
    </View>
  );
};

// Utility function to get capabilities from model
export const getModelCapabilities = (model: { capabilities?: ModelCapability[] }): ModelCapability[] => {
  return model.capabilities || ['text'];
};

// Enhanced capability detection for special model types
export const detectModelCapabilities = (modelId: string, capabilities?: ModelCapability[]): ModelCapability[] => {
  const detected: ModelCapability[] = capabilities ? [...capabilities] : ['text'];
  
  // Auto-detect based on model name patterns
  if (modelId.includes('transcribe') || modelId.includes('whisper')) {
    if (!detected.includes('audio-input')) {
      detected.push('audio-input');
    }
  }
  
  if (modelId.includes('tts') || modelId.includes('speech')) {
    if (!detected.includes('audio-output')) {
      detected.push('audio-output');
    }
  }
  
  if (modelId.includes('vision') || modelId.includes('gpt-4v')) {
    if (!detected.includes('image-input')) {
      detected.push('image-input');
    }
  }
  
  if (modelId.includes('dall-e') || modelId.includes('imagen') || modelId.includes('midjourney')) {
    if (!detected.includes('image-output')) {
      detected.push('image-output');
    }
  }
  
  return detected;
};

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});