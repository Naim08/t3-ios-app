import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Typography } from '../ui/atoms';

interface TooltipData {
  content: string;
  x: number;
  y: number;
  iconSize: number;
}

interface TooltipContextType {
  showTooltip: (data: TooltipData) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const useTooltipPortal = () => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltipPortal must be used within a TooltipPortalProvider');
  }
  return context;
};

interface TooltipPortalProviderProps {
  children: ReactNode;
}

export const TooltipPortalProvider: React.FC<TooltipPortalProviderProps> = ({ children }) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<any>(null);

  const showTooltip = (data: TooltipData) => {
    if (timeoutRef.current) {
      global.clearTimeout(timeoutRef.current);
    }
    
    setTooltip(data);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Auto-hide after 2 seconds
    timeoutRef.current = global.setTimeout(() => {
      hideTooltip();
    }, 2000);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      global.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTooltip(null);
    });
  };

  const calculatePosition = () => {
    if (!tooltip) return { left: 0, top: 0, arrowLeft: 0 };
    
    const screenWidth = Dimensions.get('window').width;
    const tooltipWidth = 160;
    
    // Calculate left position
    let left = tooltip.x - tooltipWidth / 2;
    
    // Adjust for screen boundaries
    if (left < 15) {
      left = 15;
    } else if (left + tooltipWidth > screenWidth - 15) {
      left = screenWidth - tooltipWidth - 15;
    }
    
    // Calculate arrow position relative to tooltip
    const arrowLeft = Math.max(5, Math.min(155, tooltip.x - left));
    
    // Position above the icon
    const top = tooltip.y - tooltip.iconSize - 26; // 26 = tooltip height + padding
    
    return { left, top, arrowLeft };
  };

  const position = calculatePosition();

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      <View style={{ flex: 1 }}>
        {children}
        {tooltip && (
          <View 
            style={StyleSheet.absoluteFillObject} 
            pointerEvents="none"
          >
            <Animated.View
              style={[
                styles.tooltip,
                {
                  opacity: fadeAnim,
                  top: position.top,
                  left: position.left,
                },
              ]}
            >
              <Typography variant="caption" style={styles.tooltipText}>
                {tooltip.content}
              </Typography>
              <View
                style={[
                  styles.tooltipArrow,
                  { left: position.arrowLeft - 5 },
                ]}
              />
            </Animated.View>
          </View>
        )}
      </View>
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
    elevation: 1000,
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