import React from 'react';
import {
  View,
  ViewStyle,
  AccessibilityProps,
} from 'react-native';
import { useTheme } from '../../components/ThemeProvider';

export interface SurfaceProps extends AccessibilityProps {
  children: React.ReactNode;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  padding?: keyof ReturnType<typeof useTheme>['theme']['spacing'] | number;
  borderRadius?: number;
  backgroundColor?: string;
  style?: ViewStyle;
  className?: string; // TailwindCSS classes
  testID?: string;
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  elevation = 1,
  padding,
  borderRadius = 12,
  backgroundColor,
  style,
  className,
  testID,
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

  // Generate TailwindCSS classes based on props
  const getSurfaceClasses = (): string => {
    let classes = '';
    
    // Background color
    if (backgroundColor) {
      // Use custom background color via style prop instead
    } else {
      classes += colorScheme === 'dark' ? 'bg-gray-800 ' : 'bg-white ';
    }
    
    // Border radius
    if (borderRadius === 0) {
      classes += 'rounded-none ';
    } else if (borderRadius <= 4) {
      classes += 'rounded ';
    } else if (borderRadius <= 8) {
      classes += 'rounded-lg ';
    } else if (borderRadius <= 16) {
      classes += 'rounded-xl ';
    } else {
      classes += 'rounded-2xl ';
    }
    
    // Padding
    if (typeof padding === 'string') {
      switch (padding) {
        case 'xs':
          classes += 'p-1 ';
          break;
        case 'sm':
          classes += 'p-2 ';
          break;
        case 'md':
          classes += 'p-3 ';
          break;
        case 'lg':
          classes += 'p-4 ';
          break;
      }
    } else if (typeof padding === 'number') {
      // Use style prop for custom padding
    }
    
    // Elevation/Shadow
    switch (elevation) {
      case 0:
        // No shadow
        break;
      case 1:
        classes += 'shadow-sm ';
        break;
      case 2:
        classes += 'shadow ';
        break;
      case 3:
        classes += 'shadow-md ';
        break;
      case 4:
        classes += 'shadow-lg ';
        break;
      case 5:
        classes += 'shadow-xl ';
        break;
    }

    return classes.trim();
  };

  // Build additional styles for properties not covered by Tailwind
  const additionalStyles: ViewStyle = {};
  
  if (backgroundColor) {
    additionalStyles.backgroundColor = backgroundColor;
  }
  
  if (typeof padding === 'number') {
    additionalStyles.padding = padding;
  }
  
  if (borderRadius && ![0, 4, 8, 12, 16, 20, 24].includes(borderRadius)) {
    additionalStyles.borderRadius = borderRadius;
  }

  return (
    <View
      // @ts-ignore - NativeWind className prop
      className={getSurfaceClasses()}
      style={[additionalStyles, style]}
      testID={testID}
      {...accessibilityProps}
    >
      {children}
    </View>
  );
};
