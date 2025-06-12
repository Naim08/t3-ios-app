import 'react-native-url-polyfill/auto';
import './src/polyfills'; // Import streaming polyfills
import './global.css'; // Import NativeWind CSS - temporarily disabled
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { ThemeProvider } from './src/components/ThemeProvider';
import { AuthProvider } from './src/providers/AuthProvider';
import { ProfileProvider } from './src/providers/ProfileProvider';
import { EntitlementsProvider } from './src/context/EntitlementsProvider';
import { PurchaseProvider } from './src/purchases';
import { RootNavigator } from './src/navigation/RootNavigator';
import './src/i18n';
import { LogBox } from 'react-native';

// Enable/disable strict mode for debugging
const ENABLE_STRICT_MODE = false; // Set to false to disable double renders

// APP RENDER COUNTER - GLOBAL
let globalAppRenderCount = 0;

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


// Performance optimizations and error handling
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
} else {
  // Production optimizations

  // Disable console.log in production for performance
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  // Keep console.error for crash reporting

  // Disable React Native Inspector in production
  if (global.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = null;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount = null;
  }
}


Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentry?.dsn,
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
});

const AppContent = () => {
  globalAppRenderCount++;
  console.log(`🚀🚀🚀 APP CONTENT RENDER #${globalAppRenderCount} 🚀🚀🚀`);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <PurchaseProvider>
              <EntitlementsProvider>
                <StatusBar style="auto" />
                <RootNavigator />
                <Toast />
              </EntitlementsProvider>
            </PurchaseProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(function App() {
  if (ENABLE_STRICT_MODE && __DEV__) {
    return (
      <React.StrictMode>
        <AppContent />
      </React.StrictMode>
    );
  }
  
  return <AppContent />;
});
