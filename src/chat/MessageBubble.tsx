
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
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
import { Surface, Typography } from '../ui/atoms';
import { Message } from './types';

export interface MessageBubbleProps {
  message: Message;
  style?: ViewStyle;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  style,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  
  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getBubbleStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginBottom: 16,
      maxWidth: '85%',
      minWidth: 80,
    };

    return isUser
      ? {
          ...baseStyle,
          alignSelf: 'flex-end',
          marginLeft: '15%',
        }
      : {
          ...baseStyle,
          alignSelf: 'flex-start',
          marginRight: '15%',
        };
  };

  const getSurfaceStyle = (): ViewStyle => {
    return isUser
      ? {
          backgroundColor: 'transparent',
          borderBottomRightRadius: 4,
        }
      : {
          backgroundColor: theme.colors.surface,
          borderBottomLeftRadius: 4,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
  };

  const getMarkdownStyles = () => ({
    body: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.bodyMd.fontSize,
      lineHeight: theme.typography.scale.bodyMd.lineHeight,
      fontFamily: theme.typography.fontFamily.regular,
      margin: 0,
    },
    heading1: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.h4.fontSize,
      fontWeight: theme.typography.weight.bold,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    heading2: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.h5.fontSize,
      fontWeight: theme.typography.weight.semibold,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    paragraph: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.bodyMd.fontSize,
      lineHeight: theme.typography.scale.bodyMd.lineHeight,
      marginBottom: theme.spacing.xs,
      marginTop: 0,
    },
    code_inline: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : theme.colors.gray['200'],
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: theme.typography.scale.bodySm.fontSize,
      fontFamily: 'Courier',
    },
    code_block: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : theme.colors.gray['100'],
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      padding: theme.spacing.sm,
      borderRadius: 8,
      fontSize: theme.typography.scale.bodySm.fontSize,
      fontFamily: 'Courier',
      marginVertical: theme.spacing.xs,
      overflow: 'hidden' as const, // Prevent content overflow
      flexShrink: 1, // Allow shrinking if needed
    },
    fence: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : theme.colors.gray['100'],
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      padding: theme.spacing.sm,
      borderRadius: 8,
      fontSize: theme.typography.scale.bodySm.fontSize,
      fontFamily: 'Courier',
      marginVertical: theme.spacing.xs,
      overflow: 'hidden' as const, // Prevent content overflow
      flexShrink: 1, // Allow shrinking if needed
    },
    list_item: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.bodyMd.fontSize,
      lineHeight: theme.typography.scale.bodyMd.lineHeight,
    },
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        getBubbleStyle(), 
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.messageRow}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[
                theme.colors.accent['400'],
                theme.colors.accent['600'],
              ]}
              style={styles.avatar}
            >
              <Typography
                variant="bodySm"
                weight="bold"
                color="#FFFFFF"
                align="center"
              >
                AI
              </Typography>
            </LinearGradient>
          </View>
        )}
        
        {isUser ? (
          <LinearGradient
            colors={[
              theme.colors.brand['400'],
              theme.colors.brand['600'],
            ]}
            style={[
              styles.bubble,
              styles.userBubble,
              isStreaming && styles.streamingBubble,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.markdownContainer}>
              <Markdown style={getMarkdownStyles()}>
                {message.text}
              </Markdown>
            </View>
            
            {!isStreaming && (
              <Typography
                variant="caption"
                color="rgba(255,255,255,0.8)"
                align="right"
                style={styles.timestamp}
              >
                {timestamp}
              </Typography>
            )}
          </LinearGradient>
        ) : (
          <Surface
            elevation={1}
            style={[
              styles.bubble,
              styles.aiBubble,
              getSurfaceStyle(),
              isStreaming && styles.streamingBubble,
            ]}
          >
            {isStreaming && message.text === '' && (
              <View style={styles.typingIndicator}>
                <View style={[styles.typingDot, { backgroundColor: theme.colors.brand['400'] }]} />
                <View style={[styles.typingDot, { backgroundColor: theme.colors.brand['500'], marginLeft: 4 }]} />
                <View style={[styles.typingDot, { backgroundColor: theme.colors.brand['600'], marginLeft: 4 }]} />
              </View>
            )}
            <View style={styles.markdownContainer}>
              <Markdown style={getMarkdownStyles()}>
                {message.text || ' '}
              </Markdown>
            </View>
            
            {!isStreaming && (
              <Typography
                variant="caption"
                color={theme.colors.textSecondary}
                align="left"
                style={styles.timestamp}
              >
                {timestamp}
              </Typography>
            )}
          </Surface>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    flexShrink: 1,
    maxWidth: '100%',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexShrink: 1,
    maxWidth: '100%',
  },
  avatarContainer: {
    marginRight: 10,
    marginBottom: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    flexShrink: 1,
    maxWidth: '100%',
    overflow: 'hidden' as const,
  },
  userBubble: {
    borderTopRightRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  aiBubble: {
    borderTopLeftRadius: 4,
  },
  streamingBubble: {
    minHeight: 40,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  markdownContainer: {
    flexShrink: 1,
    maxWidth: '100%',
    overflow: 'hidden' as const,
  },
  timestamp: {
    marginTop: 6,
    fontSize: 11,
  },
});
