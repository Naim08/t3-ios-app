import React from 'react';
import {
  View,
  StyleSheet,
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
  testID?: string;
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  elevation = 1,
  padding,
  borderRadius = 12,
  backgroundColor,
  style,
  testID,
  ...accessibilityProps
}) => {
  const { theme } = useTheme();

  const getElevationStyle = (): ViewStyle => {
    if (elevation === 0) {
      return {};
    }

    // iOS shadow
    const iosShadow: ViewStyle = {
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: Math.min(elevation * 2, 10),
      },
      shadowOpacity: 0.1 + elevation * 0.05,
      shadowRadius: Math.min(elevation * 4, 20),
    };

    // Android elevation
    const androidElevation: ViewStyle = {
      elevation: elevation * 2,
    };

    return {
      ...iosShadow,
      ...androidElevation,
    };
  };

  const getPaddingValue = (): number | undefined => {
    if (typeof padding === 'number') {
      return padding;
    }
    if (typeof padding === 'string') {
      return theme.spacing[padding];
    }
    return undefined;
  };

  const surfaceStyle: ViewStyle = {
    backgroundColor: backgroundColor || theme.colors.surface,
    borderRadius,
    padding: getPaddingValue(),
    ...getElevationStyle(),
  };

  return (
    <View
      style={[styles.surface, surfaceStyle, style]}
      testID={testID}
      {...accessibilityProps}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    // Base styles
  },
});
