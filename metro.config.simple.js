const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Minimal polyfills for Supabase in React Native
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'crypto-browserify',
  stream: 'stream-browserify', 
  buffer: '@craftzdog/react-native-buffer',
  // Replace ws package with React Native native WebSocket
  ws: require.resolve('./src/lib/ws-shim.js'),
};

config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config;
