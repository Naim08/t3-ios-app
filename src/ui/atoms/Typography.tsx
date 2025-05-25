import React from 'react';
import {
  Text,
  StyleSheet,
  TextStyle,
  AccessibilityProps,
} from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { TypographyVariant, TypographyWeight } from '../../theme';

export interface TypographyProps extends AccessibilityProps {
  children: React.ReactNode;
  variant?: TypographyVariant;
  weight?: TypographyWeight;
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  numberOfLines?: number;
  onPress?: () => void;
  style?: TextStyle;
  testID?: string;
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
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  ...accessibilityProps
}) => {
  const { theme } = useTheme();
  
  const variantStyles = theme.typography.scale[variant];
  const fontFamily = theme.typography.fontFamily[weight];
  const fontWeight = theme.typography.weight[weight];
  
  const textColor = color || theme.colors.textPrimary;
  
  const combinedStyle: TextStyle = {
    ...variantStyles,
    fontFamily,
    fontWeight,
    color: textColor,
    textAlign: align,
    ...style,
  };

  return (
    <Text
      style={[styles.base, combinedStyle]}
      numberOfLines={numberOfLines}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole || (onPress ? 'button' : 'text')}
      allowFontScaling={true}
      maxFontSizeMultiplier={3}
      {...accessibilityProps}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
