import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../components/ThemeProvider';

// Conditional import for LinearGradient
let LinearGradient: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
} catch (error) {
  LinearGradient = ({ children, style, ...props }: any) => 
    React.createElement(View, { style, ...props }, children);
}

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  animated = true,
}) => {
  const { theme } = useTheme();
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmer.start();

      return () => shimmer.stop();
    }
  }, [animated, shimmerAnimation]);

  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const shimmerTranslateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.gray['200'],
        },
        style,
      ]}
    >
      {animated && (
        <Animated.View
          style={[
            styles.shimmerContainer,
            { borderRadius },
            { opacity: shimmerOpacity },
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              theme.colors.gray['100'] + '80',
              theme.colors.gray['50'] + 'CC',
              theme.colors.gray['100'] + '80',
              'transparent',
            ]}
            locations={[0, 0.3, 0.5, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslateX }],
              },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
};

// Predefined skeleton components for common patterns
export const SkeletonText: React.FC<{ lines?: number; lastLineWidth?: string }> = ({
  lines = 1,
  lastLineWidth = '70%',
}) => (
  <View style={styles.textContainer}>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLoader
        key={index}
        height={16}
        width={index === lines - 1 ? lastLineWidth : '100%'}
        style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
      />
    ))}
  </View>
);

export const SkeletonAvatar: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <SkeletonLoader width={size} height={size} borderRadius={size / 2} />
);

export const SkeletonButton: React.FC<{ width?: number | string }> = ({ width = 120 }) => (
  <SkeletonLoader width={width} height={44} borderRadius={22} />
);

export const SkeletonCard: React.FC<{ height?: number }> = ({ height = 120 }) => {
  const { theme } = useTheme();
  
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          height,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <SkeletonAvatar size={32} />
        <View style={styles.cardHeaderText}>
          <SkeletonLoader height={14} width="60%" />
          <SkeletonLoader height={12} width="40%" style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={styles.cardContent}>
        <SkeletonText lines={2} lastLineWidth="80%" />
      </View>
    </View>
  );
};

// Skeleton for message bubbles
export const SkeletonMessageBubble: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.messageBubbleContainer, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
      {!isUser && (
        <View style={styles.messageAvatarContainer}>
          <SkeletonAvatar size={32} />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isUser ? theme.colors.brand['200'] : theme.colors.surface,
            borderColor: theme.colors.border,
            maxWidth: '75%',
          },
        ]}
      >
        <SkeletonText lines={Math.floor(Math.random() * 3) + 1} lastLineWidth="60%" />
      </View>
    </View>
  );
};

// Skeleton for conversation list items
export const SkeletonConversationItem: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <View
      style={[
        styles.conversationItem,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <SkeletonAvatar size={48} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <SkeletonLoader height={16} width="40%" />
          <SkeletonLoader height={12} width="20%" />
        </View>
        <SkeletonLoader height={14} width="85%" style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    width: '200%',
  },
  textContainer: {
    // Text container styles
  },
  cardContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardContent: {
    // Card content styles
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  messageAvatarContainer: {
    marginRight: 12,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});