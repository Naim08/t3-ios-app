import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
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
import { Typography, PrimaryButton, Surface, AILoadingAnimation } from '../ui/atoms';
import { useAuth } from '../providers/AuthProvider';
import { EmailOTPModal } from './EmailOTPModal';

const { width, height } = Dimensions.get('window');

export const SignInScreen = () => {
  const { theme } = useTheme();
  const { signInWithApple, loading, isOnline } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const handleAppleSignIn = async () => {
    if (!isOnline) {
      Alert.alert('No internet connection', 'Please connect to the internet to sign in.');
      return;
    }

    try {
      setIsAppleLoading(true);
      await signInWithApple();
    } catch (error: any) {
      // Error is already handled in AuthProvider with Alert
      console.error('Apple sign in failed:', error);
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    if (!isOnline) {
      Alert.alert('No internet connection', 'Please connect to the internet to sign in.');
      return;
    }
    setShowEmailModal(true);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <LinearGradient
          colors={[
            theme.colors.brand['500'] + '20',
            theme.colors.accent['500'] + '10',
            theme.colors.background,
          ]}
          style={styles.gradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.loadingContainer}>
            <AILoadingAnimation size={120} />
            <Typography 
              variant="bodyMd" 
              color={theme.colors.textSecondary}
              style={styles.loadingText}
            >
              Signing you in...
            </Typography>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <LinearGradient
        colors={[
          theme.colors.brand['500'] + '20',
          theme.colors.accent['500'] + '10',
          theme.colors.background,
        ]}
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated Background Elements */}
        <View style={styles.backgroundDecoration}>
          <View style={[styles.circle, styles.circleTop, { backgroundColor: theme.colors.brand['500'] + '10' }]} />
          <View style={[styles.circle, styles.circleBottom, { backgroundColor: theme.colors.accent['500'] + '08' }]} />
        </View>

        <View style={styles.content}>
          {!isOnline && (
            <BlurView intensity={80} style={styles.offlineBanner}>
              <Text style={styles.offlineIcon}>🔌</Text>
              <Text style={styles.offlineText}>Connect to the internet</Text>
            </BlurView>
          )}

          {/* App Icon/Logo */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoWrapper, { backgroundColor: theme.colors.brand['500'] + '15' }]}>
              <Text style={styles.logoEmoji}>🤖</Text>
            </View>
          </View>

          <Surface elevation={3} padding="lg" style={[styles.card, { backgroundColor: theme.colors.surface + 'F8' }]}>
            <View style={styles.header}>
              <Typography 
                variant="h1" 
                weight="bold" 
                align="center"
                style={[styles.title, { color: theme.colors.textPrimary }]}
              >
                Pocket T3
              </Typography>
              <Typography 
                variant="bodyLg" 
                color={theme.colors.textSecondary}
                align="center"
                style={styles.subtitle}
              >
                Chat with GPT-4, Claude, and Gemini Pro
              </Typography>
            </View>

            <View style={styles.buttonContainer}>
              {/* Primary Apple Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.modernButton,
                  { backgroundColor: theme.colors.textPrimary },
                  (!isOnline || isAppleLoading) && styles.buttonDisabled,
                ]}
                onPress={handleAppleSignIn}
                disabled={!isOnline || isAppleLoading}
                activeOpacity={0.8}
              >
                {isAppleLoading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <>
                    <Text style={styles.appleIcon}></Text>
                    <Text style={[styles.modernButtonText, { color: theme.colors.background }]}>
                      Continue with Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary Email Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.modernButton,
                  styles.emailButton,
                  { 
                    backgroundColor: 'transparent',
                    borderColor: theme.colors.brand['500'],
                  },
                  !isOnline && styles.buttonDisabled,
                ]}
                onPress={handleEmailSignIn}
                disabled={!isOnline}
                activeOpacity={0.8}
              >
                <Text style={styles.emailIcon}>📧</Text>
                <Text style={[styles.modernButtonText, { color: theme.colors.brand['500'] }]}>
                  Continue with Email
                </Text>
              </TouchableOpacity>

              {/* Terms and Privacy */}
              <View style={styles.termsContainer}>
                <Typography 
                  variant="caption" 
                  color={theme.colors.textSecondary}
                  align="center"
                  style={styles.termsText}
                >
                  By continuing, you agree to our Terms of Service
                  and Privacy Policy
                </Typography>
              </View>
            </View>
          </Surface>
        </View>
      </LinearGradient>

      <EmailOTPModal
        visible={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  backgroundDecoration: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
  },
  circleTop: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.4,
    right: -width * 0.2,
  },
  circleBottom: {
    width: width * 0.6,
    height: width * 0.6,
    bottom: -width * 0.2,
    left: -width * 0.3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  offlineIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 50,
  },
  card: {
    alignItems: 'center',
    borderRadius: 24,
    backdropFilter: 'blur(10px)',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    marginBottom: 12,
    fontSize: 32,
  },
  subtitle: {
    maxWidth: 280,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  modernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modernButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  appleIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  emailIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  emailButton: {
    borderWidth: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  termsContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  termsText: {
    lineHeight: 18,
  },
});