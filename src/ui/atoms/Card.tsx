import React from 'react';
import {
  View,
  ViewStyle,
  AccessibilityProps,
  Platform,
} from 'react-native';
import { useTheme } from '../../components/ThemeProvider';

// Import glassmorphism effects
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export interface CardProps extends AccessibilityProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'glass' | 'outlined' | 'gradient' | 'floating';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  backgroundColor?: string;
  borderColor?: string;
  style?: ViewStyle;
  className?: string; // TailwindCSS classes
  testID?: string;
  onPress?: () => void;
  disabled?: boolean;
  glow?: boolean; // Enable glow effect
  animated?: boolean; // Enable hover/press animations
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  size = 'md',
  padding = 'md',
  borderRadius = 'lg',
  backgroundColor,
  borderColor,
  style,
  className,
  testID,
  onPress,
  disabled = false,
  glow = false,
  animated = true,
  ...accessibilityProps
}) => {
  const { theme, colorScheme } = useTheme();

  // If custom className is provided, use it
  if (className) {
    return (
      <View
        // @ts-ignore - NativeWind className prop
        className={className}
        style={style}
        testID={testID}
        {...accessibilityProps}
      >
        {children}
      </View>
    );
  }

  // Enhanced styling with theme system
  const getEnhancedStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      borderRadius: getBorderRadiusValue(borderRadius),
      overflow: 'hidden',
    };

    // Padding styles
    const paddingMap = {
      none: 0,
      sm: theme.spacing.sm,
      md: theme.spacing.md,
      lg: theme.spacing.lg,
      xl: 20,
    };
    baseStyles.padding = paddingMap[padding];

    // Variant-specific styling
    switch (variant) {
      case 'elevated':
        baseStyles.backgroundColor = backgroundColor || theme.colors.surfaceElevated;
        baseStyles.borderWidth = 1;
        baseStyles.borderColor = theme.colors.borderLight;
        
        // Enhanced shadow system
        baseStyles.shadowColor = theme.colors.shadow;
        baseStyles.shadowOffset = { width: 0, height: 4 };
        baseStyles.shadowOpacity = 0.1;
        baseStyles.shadowRadius = 12;
        baseStyles.elevation = 4;
        break;

      case 'glass':
        baseStyles.backgroundColor = colorScheme === 'dark' 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(255, 255, 255, 0.25)';
        baseStyles.borderWidth = 1;
        baseStyles.borderColor = colorScheme === 'dark' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(255, 255, 255, 0.3)';
        
        // Glassmorphism shadow
        baseStyles.shadowColor = theme.colors.shadow;
        baseStyles.shadowOffset = { width: 0, height: 8 };
        baseStyles.shadowOpacity = colorScheme === 'dark' ? 0.4 : 0.15;
        baseStyles.shadowRadius = 24;
        baseStyles.elevation = 8;
        break;

      case 'outlined':
        baseStyles.backgroundColor = backgroundColor || theme.colors.surface;
        baseStyles.borderWidth = 2;
        baseStyles.borderColor = borderColor || theme.colors.border;
        break;

      case 'floating':
        baseStyles.backgroundColor = backgroundColor || theme.colors.surfaceElevated;
        baseStyles.borderWidth = 1;
        baseStyles.borderColor = theme.colors.borderLight;
        
        // Floating shadow (more dramatic)
        baseStyles.shadowColor = theme.colors.shadow;
        baseStyles.shadowOffset = { width: 0, height: 8 };
        baseStyles.shadowOpacity = 0.15;
        baseStyles.shadowRadius = 20;
        baseStyles.elevation = 12;
        break;

      case 'gradient':
        // Gradient handled separately
        baseStyles.shadowColor = theme.colors.brand['500'];
        baseStyles.shadowOffset = { width: 0, height: 6 };
        baseStyles.shadowOpacity = 0.2;
        baseStyles.shadowRadius = 16;
        baseStyles.elevation = 8;
        break;
    }

    // Glow effect
    if (glow) {
      baseStyles.shadowColor = theme.colors.brand['500'];
      baseStyles.shadowOpacity = 0.4;
      baseStyles.shadowRadius = 30;
    }

    // Interactive states
    if (disabled) {
      baseStyles.opacity = 0.5;
    }

    return baseStyles;
  };

  // Build additional styles for properties not covered by Tailwind
  const additionalStyles: ViewStyle = {};
  
  if (backgroundColor) {
    additionalStyles.backgroundColor = backgroundColor;
  }
  
  if (borderColor) {
    additionalStyles.borderColor = borderColor;
  }

  const enhancedStyles = getEnhancedStyles();

  // Special handling for glass variant with BlurView
  if (variant === 'glass') {
    return (
      <BlurView
        intensity={20}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[enhancedStyles, additionalStyles, style]}
        testID={testID}
        {...accessibilityProps}
      >
        {children}
      </BlurView>
    );
  }

  // Special handling for gradient variant
  if (variant === 'gradient') {
    const gradientColors = colorScheme === 'dark'
      ? [theme.colors.gray['800'], theme.colors.gray['900']]
      : [theme.colors.brand['50'], theme.colors.accent['50']];

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[enhancedStyles, additionalStyles, style]}
        testID={testID}
        {...accessibilityProps}
      >
        {children}
      </LinearGradient>
    );
  }

  // Default card implementation
  return (
    <View
      style={[enhancedStyles, additionalStyles, style]}
      testID={testID}
      {...accessibilityProps}
    >
      {children}
    </View>
  );
};

// Helper function to get border radius value
const getBorderRadiusValue = (borderRadius: string): number => {
  switch (borderRadius) {
    case 'sm': return 8;
    case 'md': return 12;
    case 'lg': return 16;
    case 'xl': return 20;
    case '2xl': return 24;
    case '3xl': return 32;
    default: return 16;
  }
};
