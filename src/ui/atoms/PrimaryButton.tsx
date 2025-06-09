import React from 'react';
import {
  TouchableOpacity,
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
  className?: string; // TailwindCSS classes
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
  className,
  testID,
  hapticFeedback = true,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  const { theme, colorScheme } = useTheme();

  const handlePress = async () => {
    if (disabled || loading) return;
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onPress();
  };

  // If custom className is provided, use it
  if (className) {
    return (
      <TouchableOpacity
        // @ts-ignore - NativeWind className prop
        className={className}
        style={style}
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
            color="currentColor" 
            testID={`${testID}-loading`}
          />
        ) : (
          <Typography className="text-center font-semibold">
            {title}
          </Typography>
        )}
      </TouchableOpacity>
    );
  }

  // Generate TailwindCSS classes based on props
  const getButtonClasses = (): string => {
    let classes = 'rounded-lg justify-center items-center flex-row ';
    
    // Size classes
    switch (size) {
      case 'small':
        classes += 'px-3 py-2 min-h-[36px] ';
        break;
      case 'large':
        classes += 'px-6 py-4 min-h-[52px] ';
        break;
      default: // medium
        classes += 'px-4 py-3 min-h-[44px] ';
        break;
    }

    // Disabled/loading state
    if (disabled || loading) {
      classes += colorScheme === 'dark' 
        ? 'bg-gray-700 border-gray-700 ' 
        : 'bg-gray-200 border-gray-200 ';
      return classes;
    }

    // Variant classes
    switch (variant) {
      case 'primary':
        classes += colorScheme === 'dark'
          ? 'bg-brand-500 border-brand-500 active:bg-brand-600 '
          : 'bg-brand-500 border-brand-500 active:bg-brand-600 ';
        break;
      case 'secondary':
        classes += colorScheme === 'dark'
          ? 'bg-accent-600 border-accent-600 active:bg-accent-700 '
          : 'bg-accent-600 border-accent-600 active:bg-accent-700 ';
        break;
      case 'outline':
        classes += colorScheme === 'dark'
          ? 'bg-transparent border border-brand-500 active:bg-brand-900 '
          : 'bg-transparent border border-brand-500 active:bg-brand-50 ';
        break;
      case 'ghost':
        classes += colorScheme === 'dark'
          ? 'bg-transparent border-transparent active:bg-brand-900 '
          : 'bg-transparent border-transparent active:bg-brand-50 ';
        break;
    }

    return classes.trim();
  };

  const getTextClasses = (): string => {
    let classes = 'text-center font-semibold ';
    
    // Size-based text classes
    switch (size) {
      case 'small':
        classes += 'text-body-sm ';
        break;
      case 'large':
        classes += 'text-body-lg ';
        break;
      default:
        classes += 'text-body-md ';
        break;
    }

    // Color classes
    if (disabled || loading) {
      classes += colorScheme === 'dark' ? 'text-gray-400 ' : 'text-gray-500 ';
    } else {
      switch (variant) {
        case 'primary':
        case 'secondary':
          classes += 'text-white ';
          break;
        case 'outline':
        case 'ghost':
          classes += 'text-brand-500 ';
          break;
      }
    }

    return classes.trim();
  };

  return (
    <TouchableOpacity
      // @ts-ignore - NativeWind className prop
      className={getButtonClasses()}
      style={style}
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
          color={
            disabled || loading 
              ? (colorScheme === 'dark' ? '#9CA3AF' : '#6B7280')
              : variant === 'primary' || variant === 'secondary' 
                ? '#FFFFFF' 
                : theme.colors.brand['500']
          }
          testID={`${testID}-loading`}
        />
      ) : (
        <Typography className={getTextClasses()}>
          {title}
        </Typography>
      )}
    </TouchableOpacity>
  );
};
