import { useRef, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

interface UseModalAnimationProps {
  visible: boolean;
  animationConfig?: {
    tension?: number;
    friction?: number;
    duration?: number;
    useSpring?: boolean;
  };
}

interface UseModalAnimationReturn {
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

export const useModalAnimation = ({ 
  visible, 
  animationConfig = {} 
}: UseModalAnimationProps): UseModalAnimationReturn => {
  const {
    tension = 65,
    friction = 10,
    duration = 350,
    useSpring = true
  } = animationConfig;

  // Always initialize with closed state
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation - stagger for better effect
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Delayed slide and scale animation
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension,
            friction,
            velocity: 0,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 70,
            friction: 8,
          }),
        ]).start();
      }, 50);
    } else {
      // Exit animation - faster and smoother
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim, scaleAnim, tension, friction, duration, useSpring]);

  return {
    slideAnim,
    fadeAnim,
    scaleAnim,
  };
};