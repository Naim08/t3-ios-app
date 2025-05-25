
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Markdown from 'react-native-markdown-display';
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
  
  const isUser = message.role === 'user';
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getBubbleStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginBottom: theme.spacing.sm,
      maxWidth: '90%', // More generous space for content
      minWidth: 120, // Larger minimum width for code blocks
    };

    return isUser
      ? {
          ...baseStyle,
          alignSelf: 'flex-end',
          marginLeft: '10%', // Percentage-based margin for responsiveness
        }
      : {
          ...baseStyle,
          alignSelf: 'flex-start',
          marginRight: '10%', // Percentage-based margin for responsiveness
        };
  };

  const getSurfaceStyle = (): ViewStyle => {
    return isUser
      ? {
          backgroundColor: theme.colors.brand['500'],
          borderBottomRightRadius: 4,
        }
      : {
          backgroundColor: theme.colors.surface,
          borderBottomLeftRadius: 4,
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
    <View style={[styles.container, getBubbleStyle(), style]}>
      <View style={styles.messageRow}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Surface
              elevation={1}
              style={{
                ...styles.avatar,
                backgroundColor: theme.colors.accent['500']
              }}
            >
              <Typography
                variant="bodySm"
                weight="semibold"
                color="#FFFFFF"
                align="center"
              >
                AI
              </Typography>
            </Surface>
          </View>
        )}
        
        <Surface
          elevation={isUser ? 2 : 1}
          style={{
            ...styles.bubble,
            ...getSurfaceStyle()
          }}
        >
          <View style={styles.markdownContainer}>
            <Markdown style={getMarkdownStyles()}>
              {message.text}
            </Markdown>
          </View>
          
          <Typography
            variant="caption"
            color={isUser ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary}
            align={isUser ? 'right' : 'left'}
            style={styles.timestamp}
          >
            {timestamp}
          </Typography>
        </Surface>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    flexShrink: 1, // Allow container to shrink
    maxWidth: '100%', // Ensure container doesn't exceed screen width
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexShrink: 1, // Allow row to shrink
    maxWidth: '100%', // Ensure row doesn't exceed container
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexShrink: 1, // Allow bubble to shrink to fit content
    maxWidth: '100%', // Ensure bubble doesn't exceed container
    overflow: 'hidden' as const, // Prevent content from overflowing bubble
  },
  markdownContainer: {
    flexShrink: 1, // Allow container to shrink
    maxWidth: '100%', // Ensure container doesn't exceed parent
    overflow: 'hidden' as const, // Prevent overflow
  },
  timestamp: {
    marginTop: 4,
  },
});
