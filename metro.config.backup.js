const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Add Node.js polyfills for Supabase and WebSocket dependencies
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'crypto-browserify',
  stream: 'stream-browserify', 
  buffer: '@craftzdog/react-native-buffer',
  util: 'util',
  url: 'url-polyfill',
  path: 'path-browserify',
  events: 'events-polyfill',
  http: 'stream-http',
  https: 'stream-http',
  // Replace ws package with React Native native WebSocket
  ws: require.resolve('./src/lib/ws-shim.js'),
  // Disable Node.js specific modules
  fs: false,
  net: false,
  tls: false,
  zlib: false,
  child_process: false,
  cluster: false,
  dgram: false,
  dns: false,
  readline: false,
  repl: false,
  tty: false,
  os: false,
};

config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config;
