import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, PrimaryButton, Surface } from '../ui/atoms';
import { useAuth } from '../providers/AuthProvider';
import { EmailOTPModal } from './EmailOTPModal';

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand['500']} />
          <Typography 
            variant="bodyMd" 
            color={theme.colors.textSecondary}
            style={styles.loadingText}
          >
            Signing you in...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>Connect to the internet</Text>
          </View>
        )}

        <Surface elevation={3} padding="lg" style={styles.card}>
          <View style={styles.header}>
            <Typography 
              variant="h1" 
              weight="bold" 
              align="center"
              style={styles.title}
            >
              Welcome
            </Typography>
            <Typography 
              variant="bodyLg" 
              color={theme.colors.textSecondary}
              align="center"
              style={styles.subtitle}
            >
              Sign in to continue to your AI assistant
            </Typography>
          </View>

          <View style={styles.buttonContainer}>
            {/* Primary Apple Sign In Button */}
            <PrimaryButton
              title="Continue with Apple"
              onPress={handleAppleSignIn}
              size="large"
              disabled={!isOnline || isAppleLoading}
              loading={isAppleLoading}
              style={styles.appleButton}
            />

            {/* Secondary Email Sign In Button */}
            <TouchableOpacity
              style={styles.emailButton}
              onPress={handleEmailSignIn}
              disabled={!isOnline}
            >
              <Text style={styles.emailButtonText}>
                Continue with Email
              </Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </View>

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
  loadingText: {
    marginTop: 16,
  },
  offlineBanner: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    maxWidth: 280,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  appleButton: {
    minWidth: 200,
  },
  emailButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emailButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#C7C7CC',
  },
});