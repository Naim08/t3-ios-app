import React from 'react';
import {
  Text,
  StyleSheet,
  TextStyle,
  AccessibilityProps,
} from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { TypographyVariant, TypographyWeight, getTypographyClasses } from '../../theme';

export interface TypographyProps extends AccessibilityProps {
  children: React.ReactNode;
  variant?: TypographyVariant;
  weight?: TypographyWeight;
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  numberOfLines?: number;
  onPress?: () => void;
  style?: TextStyle;
  className?: string; // TailwindCSS classes
  testID?: string;
  gradient?: boolean; // Enable gradient text effect
  glow?: boolean; // Enable text glow effect
  opacity?: number; // Text opacity
  letterSpacing?: number; // Custom letter spacing
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'bodyMd',
  weight = 'regular',
  align = 'left',
  color,
  numberOfLines,
  onPress,
  style,
  className,
  testID,
  gradient = false,
  glow = false,
  opacity = 1,
  letterSpacing,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  ...accessibilityProps
}) => {
  const { theme } = useTheme();
  
  // Enhanced styling for modern effects
  const getEnhancedStyle = (): TextStyle => {
    const variantStyles = theme.typography.scale[variant];
    const fontFamily = theme.typography.fontFamily[weight];
    const fontWeight = theme.typography.weight[weight];
    
    let textColor = color || theme.colors.textPrimary;
    
    // Apply gradient text effect (approximated with color)
    if (gradient && !color) {
      textColor = theme.colors.brand['500'];
    }
    
    const enhancedStyle: TextStyle = {
      ...variantStyles,
      fontFamily,
      fontWeight,
      color: textColor,
      textAlign: align,
      opacity,
      letterSpacing: letterSpacing || 0,
      // Enhanced line height for better readability
      lineHeight: variantStyles.lineHeight ? variantStyles.lineHeight * 1.1 : undefined,
    };
    
    // Add glow effect using shadow (iOS only, but gracefully degrades)
    if (glow) {
      enhancedStyle.textShadowColor = theme.colors.brand['500'] + '40';
      enhancedStyle.textShadowOffset = { width: 0, height: 0 };
      enhancedStyle.textShadowRadius = 8;
    }
    
    return enhancedStyle;
  };
  
  // If className is provided, use TailwindCSS approach
  if (className) {
    return (
      <Text
        // @ts-ignore - NativeWind className prop
        className={className}
        style={[style, letterSpacing ? { letterSpacing } : undefined]}
        numberOfLines={numberOfLines}
        onPress={onPress}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole || (onPress ? 'button' : 'text')}
        allowFontScaling={true}
        maxFontSizeMultiplier={2.5} // Reduced for better design consistency
        {...accessibilityProps}
      >
        {children}
      </Text>
    );
  }
  
  // Enhanced traditional theme approach
  const combinedStyle = getEnhancedStyle();

  return (
    <Text
      style={[styles.base, combinedStyle, style]}
      numberOfLines={numberOfLines}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole || (onPress ? 'button' : 'text')}
      allowFontScaling={true}
      maxFontSizeMultiplier={2.5} // Better design consistency
      {...accessibilityProps}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    // Enhanced default styling for better text rendering
    textAlignVertical: 'center',
  },
});
