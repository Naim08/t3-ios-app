import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  size?: number;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ size = 60 }) => {
  const { theme, colorScheme, toggleTheme } = useTheme();
  
  // Animation values
  const translateX = useRef(new Animated.Value(colorScheme === 'dark' ? 1 : 0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(colorScheme === 'dark' ? 0 : 1)).current;
  const moonFadeValue = useRef(new Animated.Value(colorScheme === 'dark' ? 1 : 0)).current;

  useEffect(() => {
    // Animate on theme change
    Animated.parallel([
      // Slide animation
      Animated.spring(translateX, {
        toValue: colorScheme === 'dark' ? 1 : 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
      // Rotation animation
      Animated.timing(rotateValue, {
        toValue: colorScheme === 'dark' ? 1 : 0,
        duration: 500,
        useNativeDriver: true,
      }),
      // Sun fade animation
      Animated.timing(fadeValue, {
        toValue: colorScheme === 'dark' ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Moon fade animation
      Animated.timing(moonFadeValue, {
        toValue: colorScheme === 'dark' ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [colorScheme]);

  const handlePress = () => {
    // Press animation
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    toggleTheme();
  };

  const thumbSize = size * 0.4;
  const thumbOffset = size * 0.1;
  const translateXValue = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbOffset, size - thumbSize - thumbOffset],
  });

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.container,
          {
            width: size,
            height: size * 0.6,
            backgroundColor: colorScheme === 'dark' 
              ? theme.colors.gray[800] 
              : theme.colors.gray[200],
            borderColor: colorScheme === 'dark'
              ? theme.colors.gray[700]
              : theme.colors.gray[300],
          },
        ]}
      >
        {/* Track gradient overlay */}
        <View 
          style={[
            styles.trackOverlay,
            {
              backgroundColor: colorScheme === 'dark' 
                ? theme.colors.brand[900] + '20'
                : theme.colors.accent[100] + '30',
            },
          ]} 
        />
        
        {/* Stars/Clouds decoration */}
        {colorScheme === 'dark' ? (
          <>
            {/* Stars */}
            <View style={[styles.star, { top: '20%', left: '15%' }]}>
              <View style={[styles.starDot, { backgroundColor: theme.colors.gray[400] }]} />
            </View>
            <View style={[styles.star, { top: '40%', left: '25%' }]}>
              <View style={[styles.starDot, { backgroundColor: theme.colors.gray[500] }]} />
            </View>
            <View style={[styles.star, { top: '60%', left: '20%' }]}>
              <View style={[styles.starDot, { backgroundColor: theme.colors.gray[400] }]} />
            </View>
          </>
        ) : (
          <>
            {/* Clouds */}
            <View style={[styles.cloud, { top: '25%', right: '20%' }]}>
              <View style={[styles.cloudPuff, { backgroundColor: theme.colors.gray[50] }]} />
              <View style={[styles.cloudPuff, styles.cloudPuff2, { backgroundColor: theme.colors.gray[50] }]} />
            </View>
          </>
        )}
        
        {/* Animated Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: colorScheme === 'dark' 
                ? theme.colors.gray[900]
                : theme.colors.accent[400],
              transform: [
                { translateX: translateXValue },
                { rotate: rotation },
              ],
              ...Platform.select({
                ios: {
                  shadowColor: colorScheme === 'dark' ? theme.colors.brand[400] : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                },
                android: {
                  elevation: 5,
                },
              }),
            },
          ]}
        >
          {/* Sun Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: fadeValue,
                transform: [{ scale: fadeValue }],
              },
            ]}
          >
            <View style={[styles.sun, { backgroundColor: theme.colors.accent[300] }]}>
              {/* Sun rays */}
              {[...Array(8)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.sunRay,
                    {
                      backgroundColor: theme.colors.accent[300],
                      transform: [
                        { rotate: `${i * 45}deg` },
                        { translateY: -thumbSize * 0.35 },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
          
          {/* Moon Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: moonFadeValue,
                transform: [{ scale: moonFadeValue }],
                position: 'absolute',
              },
            ]}
          >
            <View style={[styles.moon, { backgroundColor: theme.colors.gray[100] }]}>
              <View 
                style={[
                  styles.moonCrater,
                  {
                    backgroundColor: theme.colors.gray[300],
                    top: '20%',
                    left: '30%',
                  },
                ]}
              />
              <View 
                style={[
                  styles.moonCrater,
                  {
                    backgroundColor: theme.colors.gray[300],
                    width: thumbSize * 0.15,
                    height: thumbSize * 0.15,
                    bottom: '25%',
                    right: '25%',
                  },
                ]}
              />
            </View>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 100,
    padding: 2,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
  },
  thumb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  sun: {
    width: '60%',
    height: '60%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunRay: {
    position: 'absolute',
    width: 2,
    height: '20%',
    borderRadius: 1,
  },
  moon: {
    width: '70%',
    height: '70%',
    borderRadius: 100,
    overflow: 'hidden',
  },
  moonCrater: {
    position: 'absolute',
    width: '25%',
    height: '25%',
    borderRadius: 100,
    opacity: 0.5,
  },
  star: {
    position: 'absolute',
  },
  starDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  cloud: {
    position: 'absolute',
    flexDirection: 'row',
  },
  cloudPuff: {
    width: 16,
    height: 10,
    borderRadius: 5,
    opacity: 0.4,
  },
  cloudPuff2: {
    marginLeft: -4,
    marginTop: 2,
  },
});