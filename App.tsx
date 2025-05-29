
import 'react-native-url-polyfill/auto';
import './src/polyfills'; // Import streaming polyfills
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
import { LogBox } from 'react-native';

// Declare ErrorUtils type for React Native's internal error handler
declare global {
  interface ErrorUtilsStatic {
    setGlobalHandler: (callback: (error: Error, isFatal?: boolean) => void) => void;
    getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  }
  
  interface Window {
    ErrorUtils: ErrorUtilsStatic;
  }
}

// Add this at the very top of your App.js/App.tsx (before any other imports)


// Disable the native error dialog in development
if (__DEV__) {
  // This disables the React Native error dialog
  
  LogBox.ignoreAllLogs(true);
  
  // Override the error handler to prevent native alerts
  const originalErrorHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
  
  (global as any).ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    // Log the error but don't show native alert
    console.error('Global error caught:', error);
    
    // Only call original handler for fatal errors
    if (isFatal && originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });
}


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
