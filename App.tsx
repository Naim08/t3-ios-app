
import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { ThemeProvider } from './src/components/ThemeProvider';
import { AuthProvider } from './src/providers/AuthProvider';
import { EntitlementsProvider } from './src/context/EntitlementsProvider';
import { PurchaseProvider } from './src/purchases';
import { RootNavigator } from './src/navigation/RootNavigator';
import './src/i18n';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentry?.dsn,
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
});

export default Sentry.wrap(function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          
          <PurchaseProvider>
            <EntitlementsProvider>
              <StatusBar style="auto" />
              <RootNavigator />
              <Toast />
            </EntitlementsProvider>
          </PurchaseProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
});
