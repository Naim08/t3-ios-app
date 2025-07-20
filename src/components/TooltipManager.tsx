import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Typography } from '../ui/atoms';

interface TooltipData {
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TooltipContextType {
  showTooltip: (data: TooltipData) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const useTooltip = () => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};

interface TooltipProviderProps {
  children: ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showTooltip = useCallback((data: TooltipData) => {
    setTooltip(data);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const hideTooltip = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTooltip(null);
    });
  }, [fadeAnim]);

  const calculatePosition = () => {
    if (!tooltip) return { left: 0, bottom: 0 };
    
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const tooltipWidth = 160;
    const tooltipHeight = 40;
    
    // Calculate left position
    let left = tooltip.x + (tooltip.width - tooltipWidth) / 2;
    if (left < 15) left = 15;
    if (left + tooltipWidth > screenWidth - 15) {
      left = screenWidth - tooltipWidth - 15;
    }
    
    // Calculate bottom position (from top of screen)
    const bottom = screenHeight - tooltip.y + 10;
    
    return { left, bottom };
  };

  const position = calculatePosition();

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      {tooltip && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Animated.View
            style={[
              styles.tooltip,
              {
                opacity: fadeAnim,
                bottom: position.bottom,
                left: position.left,
              },
            ]}
          >
            <Typography
              variant="caption"
              style={styles.tooltipText}
            >
              {tooltip.content}
            </Typography>
            <View style={styles.tooltipArrow} />
          </Animated.View>
        </View>
      )}
    </TooltipContext.Provider>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(55, 65, 81, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    width: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(55, 65, 81, 0.95)',
  },
});