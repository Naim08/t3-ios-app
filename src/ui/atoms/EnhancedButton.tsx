import React from 'react';
import { ViewStyle, ActivityIndicator, AccessibilityProps, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../components/ThemeProvider';
import { Typography } from './Typography';
import { AnimatedTouchable } from './MicroInteractions';

// Conditional imports for gradients
let LinearGradient: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
} catch (error) {
  LinearGradient = ({ children, style, ...props }: any) => 
    React.createElement('View', { style, ...props }, children);
}

export interface EnhancedButtonProps extends AccessibilityProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  hapticFeedback?: boolean;
  animationType?: 'scale' | 'opacity' | 'both' | 'bounce';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  style,
  hapticFeedback = true,
  animationType = 'scale',
  icon,
  iconPosition = 'left',
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

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          minHeight: 36,
          borderRadius: 18,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 32,
          minHeight: 56,
          borderRadius: 28,
        };
      default: // medium
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          minHeight: 48,
          borderRadius: 24,
        };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: theme.colors.gray['100'],
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.brand['500'],
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'gradient':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default: // primary
        return {
          backgroundColor: theme.colors.brand['500'],
          borderWidth: 0,
        };
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.gray['400'];
    
    switch (variant) {
      case 'secondary':
        return theme.colors.textPrimary;
      case 'outline':
      case 'ghost':
        return theme.colors.brand['500'];
      default:
        return '#FFFFFF';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return theme.typography.scale.bodySm.fontSize;
      case 'large':
        return theme.typography.scale.bodyLg.fontSize;
      default:
        return theme.typography.scale.bodyMd.fontSize;
    }
  };

  const renderButtonContent = () => {
    const content = (
      <>
        {loading && (
          <ActivityIndicator
            size="small"
            color={getTextColor()}
            style={{ marginRight: title ? 8 : 0 }}
          />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <View style={{ marginRight: title ? 8 : 0 }}>{icon}</View>
        )}
        {title && (
          <Typography
            variant="bodyMd"
            color={getTextColor()}
            weight="semibold"
            style={{ fontSize: getFontSize() }}
          >
            {title}
          </Typography>
        )}
        {!loading && icon && iconPosition === 'right' && (
          <View style={{ marginLeft: title ? 8 : 0 }}>{icon}</View>
        )}
      </>
    );

    if (variant === 'gradient') {
      return (
        <LinearGradient
          colors={[
            disabled ? theme.colors.gray['300'] : theme.colors.brand['400'],
            disabled ? theme.colors.gray['400'] : theme.colors.brand['500'],
            disabled ? theme.colors.gray['400'] : theme.colors.accent['600'],
            disabled ? theme.colors.gray['500'] : theme.colors.brand['700'],
          ]}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: getSizeStyles().borderRadius,
          }}
        >
          {content}
        </LinearGradient>
      );
    }

    return content;
  };

  const buttonStyles = [
    {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      opacity: disabled ? 0.5 : 1,
      shadowColor: variant === 'primary' || variant === 'gradient' ? theme.colors.brand['500'] : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: variant === 'ghost' ? 0 : 0.15,
      shadowRadius: 4,
      elevation: variant === 'ghost' ? 0 : 3,
    },
    getSizeStyles(),
    getVariantStyles(),
    style,
  ];

  return (
    <AnimatedTouchable
      onPress={handlePress}
      style={buttonStyles}
      disabled={disabled || loading}
      animationType={animationType}
      hapticFeedback={hapticFeedback}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      {...accessibilityProps}
    >
      {renderButtonContent()}
    </AnimatedTouchable>
  );
};