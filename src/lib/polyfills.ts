// Required polyfills for Supabase in React Native
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from '@craftzdog/react-native-buffer';

if (typeof global === 'undefined') {
  // @ts-ignore
  global = globalThis;
}

global.Buffer = Buffer;
