import React, { useRef } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps, ViewStyle, Vibration } from 'react-native';

interface AnimatedTouchableProps extends TouchableOpacityProps {
  children: React.ReactNode;
  scaleValue?: number;
  hapticFeedback?: boolean;
  animationType?: 'scale' | 'opacity' | 'both' | 'bounce';
  duration?: number;
}

export const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({
  children,
  scaleValue = 0.95,
  hapticFeedback = true,
  animationType = 'scale',
  duration = 150,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    const animations: Animated.CompositeAnimation[] = [];

    if (animationType === 'scale' || animationType === 'both') {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: scaleValue,
          duration: duration / 2,
          useNativeDriver: true,
        })
      );
    }

    if (animationType === 'opacity' || animationType === 'both') {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: duration / 2,
          useNativeDriver: true,
        })
      );
    }

    if (animationType === 'bounce') {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: scaleValue,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        })
      );
    }

    Animated.parallel(animations).start();
  };

  const animateOut = () => {
    const animations: Animated.CompositeAnimation[] = [];

    if (animationType === 'scale' || animationType === 'both' || animationType === 'bounce') {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        })
      );
    }

    if (animationType === 'opacity' || animationType === 'both') {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  };

  const handlePressIn = (event: any) => {
    animateIn();
    if (hapticFeedback) {
      Vibration.vibrate(10);
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    animateOut();
    onPressOut?.(event);
  };

  const getAnimatedStyle = (): ViewStyle => ({
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  });

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={style}
      activeOpacity={1}
      {...props}
    >
      <Animated.View style={getAnimatedStyle()}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Hover effect for components (useful for web/desktop)
interface HoverEffectProps {
  children: React.ReactNode;
  style?: ViewStyle;
  hoverScale?: number;
  hoverOpacity?: number;
  disabled?: boolean;
}

export const HoverEffect: React.FC<HoverEffectProps> = ({
  children,
  style,
  hoverScale = 1.02,
  hoverOpacity = 0.9,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: hoverScale,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: hoverOpacity,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleHoverOut = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
      onPointerEnter={handleHoverIn}
      onPointerLeave={handleHoverOut}
    >
      {children}
    </Animated.View>
  );
};

// Floating action button with micro-interactions
interface FloatingActionButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  style?: ViewStyle;
  size?: number;
  backgroundColor?: string;
  shadowColor?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  style,
  size = 56,
  backgroundColor = '#FF4444',
  shadowColor = '#FF4444',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0.3)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shadowAnim, {
          toValue: 0.1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.timing(shadowAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Vibration.vibrate(50);
    onPress();
  };

  return (
    <AnimatedTouchable
      onPress={animatePress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        },
        style,
      ]}
      animationType="bounce"
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: shadowAnim,
        }}
      >
        {icon}
      </Animated.View>
    </AnimatedTouchable>
  );
};

// Ripple effect component
interface RippleEffectProps {
  children: React.ReactNode;
  onPress?: () => void;
  rippleColor?: string;
  rippleOpacity?: number;
  style?: ViewStyle;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  children,
  onPress,
  rippleColor = '#FFFFFF',
  rippleOpacity = 0.3,
  style,
}) => {
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const animateRipple = () => {
    rippleAnim.setValue(0);
    opacityAnim.setValue(rippleOpacity);

    Animated.parallel([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2],
  });

  return (
    <TouchableOpacity onPress={animateRipple} style={[style, { overflow: 'hidden' }]} activeOpacity={1}>
      {children}
      <Animated.View
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: rippleColor,
          transform: [
            { translateX: -50 },
            { translateY: -50 },
            { scale: rippleScale },
          ],
          opacity: opacityAnim,
        }}
      />
    </TouchableOpacity>
  );
};

// Shake animation for error states
interface ShakeViewProps {
  children: React.ReactNode;
  trigger: boolean;
  style?: ViewStyle;
  intensity?: number;
  onShakeComplete?: () => void;
}

export const ShakeView: React.FC<ShakeViewProps> = ({
  children,
  trigger,
  style,
  intensity = 10,
  onShakeComplete,
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (trigger) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: intensity, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -intensity, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: intensity, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -intensity, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => {
        onShakeComplete?.();
      });
    }
  }, [trigger, intensity, onShakeComplete]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateX: shakeAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};