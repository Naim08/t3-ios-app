const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Start with the base default config
const config = getDefaultConfig(__dirname);

// Apply Sentry configuration
const sentryConfig = getSentryExpoConfig(__dirname);
config.transformer = { ...config.transformer, ...sentryConfig.transformer };
config.serializer = { ...config.serializer, ...sentryConfig.serializer };

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

// Enable source maps in production for Hermes
if (process.env.NODE_ENV === 'production') {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      // Preserve source maps for Hermes
      mangle: {
        keep_fnames: true,
      },
      output: {
        comments: false,
        ascii_only: true,
      },
    },
  };
}

module.exports = withNativeWind(config, { input: './global.css' });