import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeProvider';
import { authModalStyles } from '../styles/authModalStyles';

// Conditional imports for gradients
let LinearGradient: any, BlurView: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
  const blurLib = require('expo-blur');
  BlurView = blurLib.BlurView;
} catch (error) {
  LinearGradient = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
  BlurView = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
}

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  showDragIndicator?: boolean;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onClose,
  showDragIndicator = true,
}) => {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={theme.isDark ? [
        '#1a1a2e',
        '#16213e',
        '#0f3460',
      ] : [
        '#ffffff',
        '#f8f9ff',
        '#f0f4ff',
      ]}
      style={authModalStyles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {showDragIndicator && (
        <View style={authModalStyles.dragIndicator} />
      )}
      
      <View style={authModalStyles.header}>
        <Text style={[authModalStyles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        
        <TouchableOpacity 
          style={authModalStyles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <BlurView
            style={authModalStyles.closeButtonBlur}
            intensity={20}
            tint={theme.isDark ? 'dark' : 'light'}
          >
            <X 
              size={18} 
              color={theme.colors.textSecondary} 
              strokeWidth={2.5} 
            />
          </BlurView>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};