import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  AccessibilityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../components/ThemeProvider';
import { Typography } from './Typography';

export interface PrimaryButtonProps extends AccessibilityProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  testID?: string;
  hapticFeedback?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  style,
  testID,
  hapticFeedback = true,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  const { theme } = useTheme();

  const handlePress = async () => {
    if (disabled || loading) return;
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onPress();
  };

  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[size],
    };

    if (disabled || loading) {
      return {
        ...baseStyle,
        backgroundColor: theme.colors.gray['200'],
        borderColor: theme.colors.gray['200'],
      };
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.brand['500'],
          borderColor: theme.colors.brand['500'],
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.accent['600'],
          borderColor: theme.colors.accent['600'],
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderColor: theme.colors.brand['500'],
          borderWidth: 1,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      default:
        return baseStyle;
    }
  };

  const getTextColor = (): string => {
    if (disabled || loading) {
      return theme.colors.gray['500'];
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
        return '#FFFFFF';
      case 'outline':
      case 'ghost':
        return theme.colors.brand['500'];
      default:
        return '#FFFFFF';
    }
  };

  const getTypographyVariant = () => {
    switch (size) {
      case 'small':
        return 'bodySm' as const;
      case 'large':
        return 'bodyLg' as const;
      default:
        return 'bodyMd' as const;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      {...accessibilityProps}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={getTextColor()} 
          testID={`${testID}-loading`}
        />
      ) : (
        <Typography
          variant={getTypographyVariant()}
          weight="semibold"
          color={getTextColor()}
          align="center"
        >
          {title}
        </Typography>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44, // WCAG AA minimum touch target
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 52,
  },
});
