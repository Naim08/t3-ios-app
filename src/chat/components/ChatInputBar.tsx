import React, { memo, useCallback, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import { Typography, TextField } from '../../ui/atoms';
import { useTheme } from '../../components/ThemeProvider';

// Conditional imports for gradients
let LinearGradient: any, BlurView: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
  const blurLib = require('expo-blur');
  BlurView = blurLib.BlurView;
} catch {
  LinearGradient = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
  BlurView = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
}

interface ChatInputBarProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  onAbortStream: () => void;
  onRetryStream: () => void;
  streamError: string | null;
  keyboardHeight: number;
  bottomInset: number;
  onScrollToBottom: () => void;
  initialText?: string;
  onTextConsumed?: () => void;
  disabled?: boolean;
}

export const ChatInputBar = memo(({ 
  onSend, 
  isStreaming, 
  onAbortStream, 
  onRetryStream,
  streamError,
  keyboardHeight,
  bottomInset,
  onScrollToBottom,
  initialText = '',
  onTextConsumed,
  disabled = false
}: ChatInputBarProps) => {
  const { theme } = useTheme();
  const [inputText, setInputText] = useState('');
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const typingAnimation = useRef(new Animated.Value(0)).current;

  // Handle initial text from suggestions
  React.useEffect(() => {
    if (initialText && initialText.trim()) {
      setInputText(initialText);
      onTextConsumed?.(); // Clear the pending suggestion
    }
  }, [initialText, onTextConsumed]); // ✅ Removed inputText from dependencies to prevent infinite loop

  // Typing indicator animation
  React.useEffect(() => {
    if (isStreaming) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnimation.setValue(0);
    }
  }, [isStreaming, typingAnimation]);

  const animateSendButton = useCallback(() => {
    Animated.sequence([
      Animated.spring(sendButtonScale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
    ]).start();
  }, [sendButtonScale]);

  const handleSend = useCallback(() => {
    if (inputText.trim().length === 0 || isStreaming || disabled) {
      return;
    }

    animateSendButton();
    // Add haptic feedback for send action
    Vibration.vibrate(50);
    
    const messageText = inputText.trim();

    // ✅ Send first, then clear input to prevent timing issues
    onSend(messageText);
    setInputText('');
  }, [inputText, isStreaming, disabled, animateSendButton, onSend]);

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      onScrollToBottom();
    }, 300);
  }, [onScrollToBottom]);

  const canSend = inputText.trim().length > 0 && !isStreaming && !disabled;

  return (
    <BlurView intensity={100} style={styles.inputBarBlur}>
      <LinearGradient
        colors={[
          theme.colors.surface + 'F0',
          theme.colors.surface + 'F8',
          theme.colors.surface + 'FF',
          theme.colors.surface + 'FC',
        ]}
        locations={[0, 0.3, 0.7, 1]}
        style={[
          styles.inputBar,
          { paddingBottom: Math.max(bottomInset, 12) },
        ]}
      >
        {/* Typing Indicator */}
        {isStreaming && (
          <Animated.View
            style={[
              styles.typingIndicator,
              {
                opacity: typingAnimation,
                transform: [{
                  scale: typingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.1],
                  }),
                }],
              },
            ]}
          >
            <Animated.View style={[
              styles.typingDot,
              {
                backgroundColor: theme.colors.brand['500'],
                transform: [{
                  scale: typingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]} />
            <Animated.View style={[
              styles.typingDot,
              { 
                marginLeft: 4,
                backgroundColor: theme.colors.brand['400'],
                transform: [{
                  scale: typingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                    extrapolate: 'clamp',
                  }),
                }],
              }
            ]} />
            <Animated.View style={[
              styles.typingDot,
              { 
                marginLeft: 4,
                backgroundColor: theme.colors.brand['300'],
                transform: [{
                  scale: typingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                    extrapolate: 'clamp',
                  }),
                }],
              }
            ]} />
          </Animated.View>
        )}
        
        <View style={styles.inputContainer}>
          {streamError && (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.danger['500'] + '15' }]}>
              <Typography variant="bodySm" color={theme.colors.danger['600']}>
                {streamError}
              </Typography>
              <TouchableOpacity onPress={onRetryStream} style={styles.retryButton}>
                <Typography variant="bodySm" color={theme.colors.brand['500']} weight="semibold">
                  Retry
                </Typography>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputWrapper}>
            <View style={[
              styles.textInputContainer,
              {
                backgroundColor: theme.colors.surface + 'E8',
                borderColor: inputText ? theme.colors.brand['400'] + '80' : 'rgba(255,255,255,0.15)',
                shadowColor: inputText ? theme.colors.brand['500'] : theme.colors.gray['300'],
              }
            ]}>
              <TextField
                value={inputText}
                onChangeText={setInputText}
                placeholder={disabled ? "Loading conversation..." : isStreaming ? "AI is typing..." : "Type your message..."}
                multiline
                numberOfLines={3}
                style={styles.textInput}
                inputStyle={styles.textInputStyle}
                editable={!isStreaming && !disabled}
                autoFocus={false}
                onFocus={handleFocus}
              />
            </View>
            
            <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: canSend
                      ? 'transparent'
                      : isStreaming
                      ? theme.colors.danger['500']
                      : theme.colors.gray['300'],
                    shadowColor: canSend ? theme.colors.brand['500'] : theme.colors.gray['400'],
                  },
                ]}
                onPress={isStreaming ? onAbortStream : handleSend}
                disabled={!canSend && !isStreaming}
                activeOpacity={0.8}
              >
                {isStreaming ? (
                  <Typography variant="h4" style={{ fontSize: 20 }}>⏹</Typography>
                ) : canSend ? (
                  <LinearGradient
                    colors={[
                      theme.colors.brand['400'],
                      theme.colors.brand['500'],
                      theme.colors.accent['600'],
                      theme.colors.brand['700'],
                    ]}
                    locations={[0, 0.3, 0.7, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButtonGradient}
                  >
                    <Typography variant="h4" color="#FFFFFF" style={{ fontSize: 20 }}>
                      ➤
                    </Typography>
                  </LinearGradient>
                ) : (
                  <Typography variant="h4" color={theme.colors.gray['500']} style={{ fontSize: 20 }}>
                    ➤
                  </Typography>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </LinearGradient>
    </BlurView>
  );
});

ChatInputBar.displayName = 'ChatInputBar';

const styles = StyleSheet.create({
  inputBarBlur: {
    // Remove absolute positioning to work with KeyboardAvoidingView
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(57, 112, 255, 0.8)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputContainer: {
    gap: 12,
    paddingTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  textInputContainer: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    minHeight: 48,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textInput: {
    maxHeight: 100,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlignVertical: 'center',
  },
  textInputStyle: {
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 22,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 107, 107, 0.7)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(255, 107, 107, 0.3)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(57, 112, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(57, 112, 255, 0.3)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});