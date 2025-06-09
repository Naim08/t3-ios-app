import React from 'react';
import {
  TouchableOpacity,
  ViewStyle,
  StyleSheet,
  AccessibilityProps,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeProvider';

export interface IconButtonProps extends AccessibilityProps {
  icon: 'settings' | 'plus' | 'chevron-left' | 'chevron-right';
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost' | 'gradient';
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const getIconComponent = (icon: IconButtonProps['icon'], size: number, color: string): React.ReactElement => {
  const iconProps = { size, color, strokeWidth: 2.5 };
  
  switch (icon) {
    case 'settings':
      return <Settings {...iconProps} />;
    case 'plus':
      return <Plus {...iconProps} />;
    case 'chevron-left':
      return <ChevronLeft {...iconProps} />;
    case 'chevron-right':
      return <ChevronRight {...iconProps} />;
    default:
      return <Settings {...iconProps} />;
  }
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  variant = 'gradient',
  disabled = false,
  style,
  testID,
  ...accessibilityProps
}) => {
  const { theme } = useTheme();

  const sizeConfig = {
    sm: {
      iconSize: 16,
      buttonSize: 36,
      typography: 'bodyMd' as const,
      padding: 8,
    },
    md: {
      iconSize: 20,
      buttonSize: 44,
      typography: 'bodyLg' as const,
      padding: 10,
    },
    lg: {
      iconSize: 24,
      buttonSize: 52,
      typography: 'h4' as const,
      padding: 12,
    },
  };

  const config = sizeConfig[size];

  const getBaseStyles = (): ViewStyle => ({
    width: config.buttonSize,
    height: config.buttonSize,
    borderRadius: config.buttonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  });

  const getShadowStyles = (): ViewStyle => {
    if (disabled || variant === 'ghost') return {};
    
    return Platform.select({
      ios: {
        shadowColor: theme.colors.brand['500'],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }) || {};
  };

  const getGradientColors = () => {
    if (disabled) {
      return [theme.colors.gray['200'], theme.colors.gray['300']];
    }
    
    switch (variant) {
      case 'gradient':
        return [theme.colors.brand['400'], theme.colors.brand['600']];
      case 'solid':
        return [theme.colors.brand['500'], theme.colors.brand['500']];
      default:
        return ['transparent', 'transparent'];
    }
  };

  const getVariantStyles = (): ViewStyle => {
    const baseStyles = getBaseStyles();
    
    if (disabled) {
      return {
        ...baseStyles,
        backgroundColor: theme.colors.gray['100'],
        opacity: 0.6,
      };
    }

    switch (variant) {
      case 'outline':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.brand['500'],
        };
      case 'ghost':
        return {
          ...baseStyles,
          backgroundColor: `${theme.colors.brand['500']}15`, // 15% opacity
        };
      case 'solid':
      case 'gradient':
      default:
        return baseStyles;
    }
  };

  const getIconColor = () => {
    if (disabled) {
      return theme.colors.gray['500'];
    }
    
    switch (variant) {
      case 'solid':
      case 'gradient':
        return '#FFFFFF';
      case 'outline':
      case 'ghost':
      default:
        return theme.colors.brand['600'];
    }
  };

  const renderContent = () => 
    getIconComponent(icon, config.iconSize, getIconColor());

  const buttonStyles = [getVariantStyles(), getShadowStyles(), style];

  if (variant === 'gradient' || variant === 'solid') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={buttonStyles}
        testID={testID}
        {...accessibilityProps}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={buttonStyles}
      testID={testID}
      {...accessibilityProps}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({});
