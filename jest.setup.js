// Jest setup for React Native testing
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';

// Set up environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock React Native modules individually to avoid TurboModule issues
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock Linking
jest.mock('react-native', () => {
  // Create a safer mock that doesn't trigger TurboModule loading
  const RN = jest.requireActual('react-native');
  
  // Mock only the parts we need, don't spread all of RN to avoid loading native modules
  return {
    // Core components that are safe to use
    View: RN.View,
    Text: RN.Text,
    TouchableOpacity: RN.TouchableOpacity,
    ScrollView: RN.ScrollView,
    TextInput: RN.TextInput,
    StyleSheet: RN.StyleSheet,
    Dimensions: RN.Dimensions,
    
    // Add the missing components that were causing undefined errors
    Modal: RN.Modal,
    KeyboardAvoidingView: RN.KeyboardAvoidingView,
    ActivityIndicator: RN.ActivityIndicator,
    Pressable: RN.Pressable,
    Image: RN.Image,
    
    // Mock the problematic modules
    Linking: {
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
      removeEventListener: jest.fn(),
      getInitialURL: jest.fn().mockResolvedValue(null),
      openURL: jest.fn().mockResolvedValue(true),
      canOpenURL: jest.fn().mockResolvedValue(true),
    },
    Alert: {
      alert: jest.fn(),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
      removeEventListener: jest.fn(),
    },
    // Mock DevMenu to prevent TurboModule error
    DevMenu: {},
    // Add other commonly used modules
    Keyboard: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dismiss: jest.fn(),
    },
    // Mock Appearance module
    Appearance: {
      getColorScheme: jest.fn().mockReturnValue('light'),
      addChangeListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: {} },
    executionEnvironment: 'bare',
  },
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn().mockResolvedValue({
    type: 'success',
    url: 'test://callback'
  }),
  maybeCompleteAuthSession: jest.fn(),
  dismissBrowser: jest.fn(),
}));

// Mock expo-haptics to prevent ExpoUpdates error
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock react-native-iap to prevent TurboModule errors
jest.mock('react-native-iap', () => ({
  default: {
    initConnection: jest.fn().mockResolvedValue(true),
    endConnection: jest.fn().mockResolvedValue(true),
    getProducts: jest.fn().mockResolvedValue([]),
    getSubscriptions: jest.fn().mockResolvedValue([]),
    requestPurchase: jest.fn().mockResolvedValue({}),
    finishTransaction: jest.fn().mockResolvedValue(true),
    validateReceiptIos: jest.fn().mockResolvedValue({}),
    validateReceiptAndroid: jest.fn().mockResolvedValue({}),
  },
  Product: {},
  ProductPurchase: {},
  PurchaseError: {},
  IAPErrorCode: {},
  purchaseErrorListener: jest.fn(),
  purchaseUpdatedListener: jest.fn(),
}));

// Mock Supabase globally for all tests
jest.mock('./src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Global setup
global.__DEV__ = true;
