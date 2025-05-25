const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { getDefaultConfig } = require('expo/metro-config');

// Start with Sentry config  
const config = getSentryExpoConfig(__dirname);

// Merge with Expo default config
const defaultConfig = getDefaultConfig(__dirname);
config.resolver = { ...defaultConfig.resolver, ...config.resolver };

// Fix for Supabase realtime-js package exports issue
// See: https://github.com/supabase/realtime-js/issues/415
config.resolver.unstable_enablePackageExports = false;

// Minimal polyfills for Supabase in React Native
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'crypto-browserify',
  stream: 'stream-browserify', 
  buffer: '@craftzdog/react-native-buffer',
};

config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config;