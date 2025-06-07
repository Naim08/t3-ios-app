import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AILoadingAnimationProps {
  size?: number;
  duration?: number;
}

export const AILoadingAnimation: React.FC<AILoadingAnimationProps> = ({ 
  size = 120, 
  duration = 3000 
}) => {
  // Animation values for background elements
  const backgroundAnimation1 = useRef(new Animated.Value(0)).current;
  const backgroundAnimation2 = useRef(new Animated.Value(0)).current;
  const backgroundAnimation3 = useRef(new Animated.Value(0)).current;
  const backgroundAnimation4 = useRef(new Animated.Value(0)).current;
  const backgroundAnimation5 = useRef(new Animated.Value(0)).current;
  const backgroundAnimation6 = useRef(new Animated.Value(0)).current;
  const backgroundAnimation7 = useRef(new Animated.Value(0)).current;

  // Animation values for star elements
  const starAnimation1 = useRef(new Animated.Value(0)).current;
  const starAnimation2 = useRef(new Animated.Value(0)).current;
  const starAnimation3 = useRef(new Animated.Value(0)).current;
  const starAnimation4 = useRef(new Animated.Value(0)).current;
  const starAnimation5 = useRef(new Animated.Value(0)).current;
  const starAnimation6 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBackgroundAnimation = (animValue: Animated.Value, delay: number) => {
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

    const createStarAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: (duration * 2) / 3,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start background animations with staggered delays
    const backgroundAnimations = [
      createBackgroundAnimation(backgroundAnimation1, 0),
      createBackgroundAnimation(backgroundAnimation2, duration / 7),
      createBackgroundAnimation(backgroundAnimation3, (duration * 2) / 7),
      createBackgroundAnimation(backgroundAnimation4, (duration * 3) / 7),
      createBackgroundAnimation(backgroundAnimation5, (duration * 4) / 7),
      createBackgroundAnimation(backgroundAnimation6, (duration * 5) / 7),
      createBackgroundAnimation(backgroundAnimation7, (duration * 6) / 7),
    ];

    // Start star animations with different delays
    const starAnimations = [
      createStarAnimation(starAnimation1, 0),
      createStarAnimation(starAnimation2, duration / 6),
      createStarAnimation(starAnimation3, (duration * 2) / 6),
      createStarAnimation(starAnimation4, (duration * 3) / 6),
      createStarAnimation(starAnimation5, (duration * 4) / 6),
      createStarAnimation(starAnimation6, (duration * 5) / 6),
    ];

    // Start all animations
    Animated.parallel([...backgroundAnimations, ...starAnimations]).start();

    return () => {
      // Cleanup animations
      [...backgroundAnimations, ...starAnimations].forEach(anim => anim.stop());
    };
  }, [duration]);

  const renderBackgroundElement = (animValue: Animated.Value, index: number) => {
    const opacity = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.6],
    });

    const scale = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1.2],
    });

    // Position each background element in a circular pattern
    const angle = (index / 7) * 2 * Math.PI;
    const radius = size * 0.4;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return (
      <Animated.View
        key={`bg-${index}`}
        style={[
          styles.backgroundElement,
          {
            opacity,
            transform: [{ scale }, { translateX: x }, { translateY: y }],
            width: size * 0.3,
            height: size * 0.3,
          },
        ]}
      >
        <LinearGradient
          colors={['#FF4444', '#FFAA00', '#FF8800']}
          style={styles.gradientCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
      </Animated.View>
    );
  };

  const renderStarElement = (animValue: Animated.Value, index: number) => {
    const opacity = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 1],
    });

    const scale = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    // Position stars in a different pattern
    const angle = (index / 6) * 2 * Math.PI + Math.PI / 6;
    const radius = size * 0.25;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return (
      <Animated.View
        key={`star-${index}`}
        style={[
          styles.starElement,
          {
            opacity,
            transform: [{ scale }, { translateX: x }, { translateY: y }],
            width: size * 0.15,
            height: size * 0.15,
          },
        ]}
      >
        <LinearGradient
          colors={['#88FF88', '#FFAA00', '#FF8800']}
          style={styles.starShape}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background elements */}
      {[
        backgroundAnimation1,
        backgroundAnimation2,
        backgroundAnimation3,
        backgroundAnimation4,
        backgroundAnimation5,
        backgroundAnimation6,
        backgroundAnimation7,
      ].map((animValue, index) => renderBackgroundElement(animValue, index))}

      {/* Star elements */}
      {[
        starAnimation1,
        starAnimation2,
        starAnimation3,
        starAnimation4,
        starAnimation5,
        starAnimation6,
      ].map((animValue, index) => renderStarElement(animValue, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundElement: {
    position: 'absolute',
    borderRadius: 1000,
    overflow: 'hidden',
  },
  gradientCircle: {
    flex: 1,
    borderRadius: 1000,
  },
  starElement: {
    position: 'absolute',
    borderRadius: 1000,
    overflow: 'hidden',
  },
  starShape: {
    flex: 1,
    borderRadius: 1000,
  },
});
