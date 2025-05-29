// React Native Streaming Polyfill Setup
// Based on: https://gist.github.com/aretrace/bcb0777c2cfd2b0b1d9dcfb805fe2838

import {
  TextDecoderStream,
  TextEncoderStream,
} from '@stardazed/streams-text-encoding';
import { fetch } from 'expo/fetch';

// Setup streaming polyfills for React Native
export const originalFetch = global.fetch;
global.fetch = fetch as any;

global.TextEncoderStream = TextEncoderStream;
global.TextDecoderStream = TextDecoderStream;

// Declare global types for TypeScript
declare global {
  interface RequestInit {
    /**
     * @description Polyfilled to enable text ReadableStream for React Native:
     * @link https://github.com/facebook/react-native/issues/27741#issuecomment-2362901032
     */
    reactNative?: {
      textStreaming: boolean;
    };
  }
}
