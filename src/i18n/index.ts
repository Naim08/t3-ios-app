import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome: 'Welcome to Pocket T3',
      toggleTheme: 'Toggle Theme',
      common: {
        ok: 'OK',
        cancel: 'Cancel',
      },
      models: {
        selectModel: 'Select AI Model',
        remainingTokens: '{{count}} tokens remaining this month',
        premium: 'Premium',
        unlock: 'Unlock ➜',
        unlockAccessibility: 'Unlock premium model',
        unlockHint: 'Tap to view subscription options',
        selectModelHint: 'Tap to select this model',
        unlockRequiredHint: 'Premium subscription required',
      },
      paywall: {
        title: 'Unlock Premium Models',
        subtitle: 'Get access to GPT-4o, Claude Sonnet, and 150K monthly tokens',
        price: '$7.99/month',
        priceDescription: '150K tokens • Cancel anytime',
        alternative: 'Or add your own API key',
        subscribe: 'Subscribe to Premium',
        enterKey: 'Enter API Key',
        subscribeAccessibility: 'Subscribe to premium plan',
        subscribeHint: 'Start premium subscription',
        enterKeyAccessibility: 'Enter your own API key',
        enterKeyHint: 'Use your own OpenAI or Anthropic API key',
        privacyPolicy: 'Privacy Policy',
        terms: 'Terms of Service',
        premiumImageAlt: 'Premium subscription illustration',
        offlineTitle: 'No Internet Connection',
        offlineMessage: 'Please connect to the internet to subscribe.',
        purchaseSuccessTitle: 'Welcome to Premium!',
        purchaseSuccessMessage: 'You now have access to all premium models.',
        purchaseErrorTitle: 'Purchase Failed',
        purchaseErrorMessage: 'Something went wrong. Please try again.',
        settingsTitle: 'API Key Setup',
        settingsMessage: 'This would navigate to settings to enter your API key.',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
