import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
// Conditional imports for gradients
let LinearGradient, BlurView;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
  const blurLib = require('expo-blur');
  BlurView = blurLib.BlurView;
} catch (error) {
  console.warn('Gradient/Blur libraries not available, using fallback components');
  LinearGradient = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);
  BlurView = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);
}
import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface } from '../ui/atoms';

const { width } = Dimensions.get('window');

interface EmptyStateProps {
  onSuggestionPress?: (suggestion: string) => void;
}

const EmptyStateComponent: React.FC<EmptyStateProps> = ({ onSuggestionPress }) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const suggestions = useMemo(() => [
    { icon: '💡', text: 'Explain quantum computing in simple terms' },
    { icon: '🚀', text: 'Help me write a business plan for a startup' },
    { icon: '🎨', text: 'Generate creative ideas for a birthday party' },
    { icon: '📚', text: 'Summarize the key points of machine learning' },
  ], []);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Background decoration */}
      <View style={styles.backgroundDecoration}>
        <LinearGradient
          colors={[
            theme.colors.brand['500'] + '10',
            theme.colors.accent['500'] + '08',
          ]}
          style={styles.gradientCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      
      <BlurView intensity={95} style={styles.card}>
        <LinearGradient
          colors={[
            theme.colors.surface + 'F8',
            theme.colors.surface + 'F0',
          ]}
          style={styles.cardGradient}
        >
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                transform: [{ translateY: floatAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[
                theme.colors.brand['400'],
                theme.colors.brand['600'],
              ]}
              style={styles.icon}
            >
              <Typography variant="h1" color="#FFFFFF" align="center">
                🤖
              </Typography>
            </LinearGradient>
          </Animated.View>
          
          <Typography
            variant="h2"
            weight="bold"
            align="center"
            style={[styles.title, { color: theme.colors.textPrimary }]}
          >
            Welcome to Pocket T3
          </Typography>
          
          <Typography
            variant="bodyLg"
            color={theme.colors.textSecondary}
            align="center"
            style={styles.subtitle}
          >
            Chat with GPT-4, Claude, and Gemini Pro.
            Ask anything, get instant answers.
          </Typography>
          
          <View style={styles.suggestions}>
            <Typography
              variant="caption"
              color={theme.colors.textSecondary}
              align="center"
              weight="semibold"
              style={styles.suggestionsTitle}
            >
              TRY ASKING
            </Typography>
            
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onSuggestionPress?.(suggestion.text)}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateX: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.surface,
                      theme.colors.gray['50'],
                    ]}
                    style={[
                      styles.suggestion,
                      {
                        borderColor: theme.colors.brand['200'],
                        borderWidth: 1,
                      },
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Typography variant="h4" style={styles.suggestionIcon}>
                      {suggestion.icon}
                    </Typography>
                    <Typography 
                      variant="bodyMd" 
                      color={theme.colors.textPrimary}
                      style={styles.suggestionText}
                    >
                      {suggestion.text}
                    </Typography>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backgroundDecoration: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientCircle: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.75,
    opacity: 0.5,
  },
  card: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 36,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginBottom: 32,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  suggestions: {
    gap: 12,
  },
  suggestionsTitle: {
    marginBottom: 16,
    letterSpacing: 1,
  },
  suggestion: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    lineHeight: 22,
  },
});

export const EmptyState = React.memo(EmptyStateComponent);
