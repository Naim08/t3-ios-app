import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, Easing } from 'react-native';

export type TransitionType = 
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'scale-spring'
  | 'bounce'
  | 'flip';

export type TransitionEasing = 
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'spring';

interface TransitionViewProps {
  children: React.ReactNode;
  visible: boolean;
  type?: TransitionType;
  duration?: number;
  delay?: number;
  easing?: TransitionEasing;
  style?: ViewStyle;
  onTransitionComplete?: () => void;
  // Additional props for specific transitions
  slideDistance?: number;
  scaleFrom?: number;
  scaleTo?: number;
}

export const TransitionView: React.FC<TransitionViewProps> = ({
  children,
  visible,
  type = 'fade',
  duration = 300,
  delay = 0,
  easing = 'ease-out',
  style,
  onTransitionComplete,
  slideDistance = 20,
  scaleFrom = 0.8,
  scaleTo = 1,
}) => {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(visible ? 0 : slideDistance)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? scaleTo : scaleFrom)).current;

  const getEasingFunction = (easingType: TransitionEasing) => {
    switch (easingType) {
      case 'linear': return Easing.linear;
      case 'ease': return Easing.ease;
      case 'ease-in': return Easing.in(Easing.ease);
      case 'ease-out': return Easing.out(Easing.ease);
      case 'ease-in-out': return Easing.inOut(Easing.ease);
      case 'bounce': return Easing.bounce;
      case 'spring': return Easing.elastic(1);
      default: return Easing.out(Easing.ease);
    }
  };

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];
    
    if (type === 'fade') {
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: visible ? 1 : 0,
          duration,
          delay,
          easing: getEasingFunction(easing),
          useNativeDriver: true,
        })
      );
    }

    if (type.startsWith('slide')) {
      const targetValue = visible ? 0 : slideDistance;
      animations.push(
        Animated.timing(slideAnim, {
          toValue: targetValue,
          duration,
          delay,
          easing: getEasingFunction(easing),
          useNativeDriver: true,
        })
      );
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: visible ? 1 : 0,
          duration,
          delay,
          easing: getEasingFunction(easing),
          useNativeDriver: true,
        })
      );
    }

    if (type === 'scale' || type === 'scale-spring') {
      const targetValue = visible ? scaleTo : scaleFrom;
      if (type === 'scale-spring') {
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: targetValue,
            delay,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          })
        );
      } else {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: targetValue,
            duration,
            delay,
            easing: getEasingFunction(easing),
            useNativeDriver: true,
          })
        );
      }
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: visible ? 1 : 0,
          duration,
          delay,
          easing: getEasingFunction(easing),
          useNativeDriver: true,
        })
      );
    }

    if (type === 'bounce') {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: visible ? scaleTo : scaleFrom,
          delay,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        })
      );
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: visible ? 1 : 0,
          duration: duration / 2,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (animations.length > 0) {
      const animation = Animated.parallel(animations);
      animation.start(({ finished }) => {
        if (finished && onTransitionComplete) {
          onTransitionComplete();
        }
      });
      
      return () => animation.stop();
    }
  }, [visible, type, duration, delay, easing, slideDistance, scaleFrom, scaleTo]);

  const getTransform = () => {
    const transforms: any[] = [];

    if (type === 'slide-up') {
      transforms.push({ translateY: slideAnim });
    } else if (type === 'slide-down') {
      transforms.push({ translateY: slideAnim.interpolate({
        inputRange: [0, slideDistance],
        outputRange: [0, -slideDistance],
      }) });
    } else if (type === 'slide-left') {
      transforms.push({ translateX: slideAnim });
    } else if (type === 'slide-right') {
      transforms.push({ translateX: slideAnim.interpolate({
        inputRange: [0, slideDistance],
        outputRange: [0, -slideDistance],
      }) });
    }

    if (type === 'scale' || type === 'scale-spring' || type === 'bounce') {
      transforms.push({ scale: scaleAnim });
    }

    if (type === 'flip') {
      transforms.push({ 
        rotateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['90deg', '0deg'],
        })
      });
    }

    return transforms;
  };

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: getTransform(),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Predefined transition components for common use cases
export const FadeInView: React.FC<Omit<TransitionViewProps, 'type'>> = (props) => (
  <TransitionView {...props} type="fade" />
);

export const SlideInView: React.FC<Omit<TransitionViewProps, 'type'> & { direction?: 'up' | 'down' | 'left' | 'right' }> = ({ 
  direction = 'up', 
  ...props 
}) => (
  <TransitionView {...props} type={`slide-${direction}` as TransitionType} />
);

export const ScaleInView: React.FC<Omit<TransitionViewProps, 'type'> & { spring?: boolean }> = ({ 
  spring = false, 
  ...props 
}) => (
  <TransitionView {...props} type={spring ? 'scale-spring' : 'scale'} />
);

export const BounceInView: React.FC<Omit<TransitionViewProps, 'type'>> = (props) => (
  <TransitionView {...props} type="bounce" />
);

export const FlipInView: React.FC<Omit<TransitionViewProps, 'type'>> = (props) => (
  <TransitionView {...props} type="flip" />
);

// Staggered animation container for lists
interface StaggeredViewProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  visible: boolean;
  type?: TransitionType;
  duration?: number;
}

export const StaggeredView: React.FC<StaggeredViewProps> = ({
  children,
  staggerDelay = 100,
  visible,
  type = 'slide-up',
  duration = 300,
}) => {
  return (
    <View>
      {React.Children.map(children, (child, index) => (
        <TransitionView
          visible={visible}
          type={type}
          duration={duration}
          delay={index * staggerDelay}
        >
          {child}
        </TransitionView>
      ))}
    </View>
  );
};