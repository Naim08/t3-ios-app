import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../components/ThemeProvider';

interface PulseLoaderProps {
  size?: number;
  color?: string;
  pulseCount?: number;
  duration?: number;
  style?: ViewStyle;
  intensity?: 'subtle' | 'normal' | 'strong';
}

export const PulseLoader: React.FC<PulseLoaderProps> = ({
  size = 12,
  color,
  pulseCount = 3,
  duration = 1200,
  style,
  intensity = 'normal',
}) => {
  const { theme } = useTheme();
  const animations = useRef(
    Array.from({ length: pulseCount }, () => new Animated.Value(0))
  ).current;

  const actualColor = color || theme.colors.brand['500'];

  useEffect(() => {
    const createPulse = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const pulseAnimations = animations.map((anim, index) =>
      createPulse(anim, (duration / pulseCount) * index)
    );

    Animated.parallel(pulseAnimations).start();

    return () => {
      pulseAnimations.forEach(anim => anim.stop());
    };
  }, [animations, duration, pulseCount]);

  const getIntensityValues = () => {
    switch (intensity) {
      case 'subtle':
        return { scaleRange: [0.8, 1.1], opacityRange: [0.3, 0.6] };
      case 'normal':
        return { scaleRange: [0.6, 1.4], opacityRange: [0.2, 0.8] };
      case 'strong':
        return { scaleRange: [0.4, 1.8], opacityRange: [0.1, 1] };
      default:
        return { scaleRange: [0.6, 1.4], opacityRange: [0.2, 0.8] };
    }
  };

  const { scaleRange, opacityRange } = getIntensityValues();

  return (
    <View style={[styles.container, style]}>
      {animations.map((anim, index) => {
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: scaleRange,
        });

        const opacity = anim.interpolate({
          inputRange: [0, 1],
          outputRange: opacityRange,
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.pulse,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: actualColor,
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// Typing indicator with pulse dots
export const TypingIndicator: React.FC<{
  isVisible?: boolean;
  dotSize?: number;
  dotColor?: string;
}> = ({ isVisible = true, dotSize = 8, dotColor }) => {
  const { theme } = useTheme();
  
  if (!isVisible) return null;

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingDots}>
        <PulseLoader
          size={dotSize}
          color={dotColor || theme.colors.textSecondary}
          pulseCount={3}
          duration={800}
          intensity="subtle"
        />
      </View>
    </View>
  );
};

// Heartbeat loader for more organic feel
export const HeartbeatLoader: React.FC<PulseLoaderProps> = (props) => (
  <PulseLoader
    {...props}
    pulseCount={1}
    duration={1000}
    intensity="strong"
  />
);

// Breathing loader for very subtle animations
export const BreathingLoader: React.FC<PulseLoaderProps> = (props) => (
  <PulseLoader
    {...props}
    pulseCount={1}
    duration={2000}
    intensity="subtle"
  />
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
  },
  typingContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});