import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  ViewStyle,
} from 'react-native';
import { Mic, MicOff, X } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeProvider';
import { Typography } from '../../ui/atoms';
import { useAudioRecording } from '../../hooks/useAudioRecording';

// Conditional import for gradient
let LinearGradient: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
} catch (error) {
  LinearGradient = ({ children, style, ...props }: any) => 
    React.createElement(View, { style, ...props }, children);
}

interface AudioInputButtonProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AudioInputButton: React.FC<AudioInputButtonProps> = ({
  onRecordingComplete,
  onError,
  disabled = false,
  style,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission,
    requestPermission,
  } = useAudioRecording({
    onRecordingComplete,
    onError,
  });

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording, pulseAnim, glowAnim]);

  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const handlePress = async () => {
    if (disabled) return;

    if (isRecording) {
      await stopRecording();
    } else {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          onError?.(new Error('Microphone permission denied'));
          return;
        }
      }
      await startRecording();
    }
  };

  const handleCancel = async () => {
    await cancelRecording();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <View style={[styles.container, style]}>
      {isRecording && (
        <>
          {/* Pulse effect */}
          <Animated.View
            style={[
              styles.pulse,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
                backgroundColor: theme.colors.danger['500'],
              },
            ]}
          />
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
                shadowColor: theme.colors.danger['500'],
              },
            ]}
          />
        </>
      )}

      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.8}
          style={[
            styles.button,
            {
              backgroundColor: isRecording 
                ? theme.colors.danger['500']
                : disabled 
                  ? theme.colors.gray['300']
                  : theme.colors.brand['500'],
              shadowColor: isRecording 
                ? theme.colors.danger['500']
                : theme.colors.brand['500'],
            },
            disabled && styles.disabledButton,
          ]}
        >
          {isRecording ? (
            <LinearGradient
              colors={[
                theme.colors.danger['600'],
                theme.colors.danger['500'],
                theme.colors.danger['400'],
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            >
              <Mic size={24} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
          ) : (
            <Mic 
              size={24} 
              color={disabled ? theme.colors.gray['500'] : '#FFFFFF'} 
              strokeWidth={2.5} 
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingInfo}>
          <View style={styles.recordingDot} />
          <Typography 
            variant="caption" 
            weight="medium"
            style={{ color: theme.colors.danger['600'] }}
          >
            {formatDuration(duration)}
          </Typography>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={theme.colors.gray['600']} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  disabledButton: {
    opacity: 0.6,
  },
  gradientBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  glow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  recordingInfo: {
    position: 'absolute',
    top: -30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  cancelButton: {
    marginLeft: 8,
  },
});