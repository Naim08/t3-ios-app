import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Button,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../components/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { Typography, PrimaryButton, Surface } from '../ui/atoms';
import * as Sentry from '@sentry/react-native';

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Surface elevation={3} padding="lg" style={styles.welcomeCard}>
          <Typography
            variant="h1"
            weight="bold"
            color={theme.colors.brand['500']}
            align="center"
            style={styles.title}
          >
            {t('welcome')}
          </Typography>
          
          <Typography
            variant="bodyLg"
            color={theme.colors.textSecondary}
            align="center"
            style={styles.subtitle}
          >
            Welcome back, {user?.user_metadata?.full_name || user?.email || 'User'}!
          </Typography>
          
          <PrimaryButton
            title="View Design System Demo"
            onPress={() => navigation.navigate('Demo')}
            size="large"
            style={styles.demoButton}
          />
          
          <PrimaryButton
            title="💬 Chat with AI Assistant"
            onPress={() => navigation.navigate('Chat')}
            variant="secondary"
            size="large"
            style={styles.chatButton}
          />
          
          <PrimaryButton
            title={t('toggleTheme')}
            onPress={toggleTheme}
            variant="outline"
            style={styles.themeButton}
          />
          
          <PrimaryButton
            title="Sign Out"
            onPress={signOut}
            variant="ghost"
            style={styles.signOutButton}
          />
        </Surface>
        
        <Surface elevation={1} padding="md" style={styles.debugCard}>
          <Typography variant="h6" weight="semibold" style={styles.debugTitle}>
            Debug Actions
          </Typography>
          <Button 
            title='Test Sentry Error' 
            onPress={() => { 
              Sentry.captureException(new Error('Test error from design system')) 
            }}
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
    alignItems: 'center',
    padding: 16,
  },
  welcomeCard: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 16,
  },
  subtitle: {
    marginBottom: 24,
  },
  demoButton: {
    marginBottom: 12,
  },
  chatButton: {
    marginBottom: 12,
  },
  themeButton: {
    marginBottom: 12,
  },
  signOutButton: {
    marginBottom: 0,
  },
  debugCard: {
    width: '100%',
  },
  debugTitle: {
    marginBottom: 12,
  },
});
