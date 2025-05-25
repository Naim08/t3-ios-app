import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, PrimaryButton, Surface } from '../ui/atoms';
import { useAuth } from '../providers/AuthProvider';

export const SignInScreen = () => {
  const { theme } = useTheme();
  const { signIn, loading } = useAuth();

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

          <PrimaryButton
            title="Sign in with Apple"
            onPress={signIn}
            size="large"
            disabled={loading}
            loading={loading}
            style={styles.signInButton}
          />
        </Surface>
      </View>
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
  signInButton: {
    minWidth: 200,
  },
});