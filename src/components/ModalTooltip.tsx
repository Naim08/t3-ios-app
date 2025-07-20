import React, { useState, useRef } from 'react';
import { 
  View, 
  Modal, 
  TouchableWithoutFeedback, 
  Animated, 
  Dimensions,
  StyleSheet 
} from 'react-native';
import { Typography } from '../ui/atoms';

export const useModalTooltip = (content: string) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<number | null>(null);

  const showTooltip = (elementRef: React.RefObject<any>) => {
    if (elementRef.current) {
      elementRef.current.measure((_x: any, _y: any, width: number, height: number, pageX: number, pageY: number) => {
        const screenWidth = Dimensions.get('window').width;
        const tooltipWidth = 160;
        
        // Calculate position
        let left = pageX + width / 2 - tooltipWidth / 2;
        
        // Adjust for screen boundaries
        if (left < 15) left = 15;
        if (left + tooltipWidth > screenWidth - 15) {
          left = screenWidth - tooltipWidth - 15;
        }
        
        const top = pageY - 40; // Position above the element
        
        setPosition({ x: left, y: top });
        setVisible(true);
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
        // Auto-hide after 2 seconds
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          hideTooltip();
        }, 2000) as any;
      });
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  const TooltipModal = () => (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={hideTooltip}
    >
      <TouchableWithoutFeedback onPress={hideTooltip}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.tooltip,
              {
                opacity: fadeAnim,
                left: position.x,
                top: position.y,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Typography variant="caption" style={styles.tooltipText}>
              {content}
            </Typography>
            <View style={styles.tooltipArrow} />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return { showTooltip, TooltipModal };
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
    left: '50%',
    marginLeft: -5,
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