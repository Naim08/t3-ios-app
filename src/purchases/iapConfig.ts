/**
 * In-App Purchase Configuration
 * Contains all IAP product definitions, subscription group information,
 * and configuration constants for Apple App Store and Google Play.
 */

export interface IAPProduct {
  id: string;
  appleId?: string;
  type: 'subscription' | 'consumable';
  price: string;
  tokens?: number;
  description: string;
}

export interface SubscriptionGroup {
  id: string;
  name: string;
  products: string[];
}

/**
 * Apple App Store Configuration
 */
export const APPLE_CONFIG = {
  bundleId: 'org.name.pockett3',
  subscriptionGroupId: '21693600', // CRITICAL: Required for subscription validation
  sharedSecret: process.env.APPLE_SHARED_SECRET, // Set in Supabase edge function env
} as const;

/**
 * Subscription Group Configuration
 * Groups related subscriptions for upgrade/downgrade management
 */
export const SUBSCRIPTION_GROUPS: SubscriptionGroup[] = [
  {
    id: '21693600',
    name: 'Premium Subscriptions',
    products: ['premium_pass_monthly']
  }
];

/**
 * Product Definitions
 * All IAP products with their Apple Store IDs and metadata
 */
export const IAP_PRODUCTS: Record<string, IAPProduct> = {
  // Premium Subscription
  premium_pass_monthly: {
    id: 'premium_pass_monthly',
    appleId: '6746395067',
    type: 'subscription',
    price: '$7.99',
    tokens: 500000, // Monthly token allowance
    description: 'Premium Pass - Monthly subscription with 500K tokens and premium AI models'
  },
  
  // Token Packages (Consumables)
  '25K_tokens': {
    id: '25K_tokens',
    appleId: '6746413005',
    type: 'consumable',
    price: '$2.99',
    tokens: 25000,
    description: '25,000 tokens package'
  },
  
  '100K_tokens': {
    id: '100K_tokens',
    appleId: '6746396078',
    type: 'consumable',
    price: '$9.99',
    tokens: 110000, // 100K + 10K bonus
    description: '100,000 tokens package (includes 10K bonus)'
  },
  
  'tokens_250k': {
    id: 'tokens_250k',
    appleId: '6746395610',
    type: 'consumable',
    price: '$19.99',
    tokens: 300000, // 250K + 50K bonus
    description: '250,000 tokens package (includes 50K bonus)'
  },
  
  '500K_tokens': {
    id: '500K_tokens',
    appleId: '6746412948',
    type: 'consumable',
    price: '$34.99',
    tokens: 650000, // 500K + 150K bonus
    description: '500,000 tokens package (includes 150K bonus)'
  }
};

/**
 * Product ID Collections for easy access
 */
export const PRODUCT_IDS = {
  SUBSCRIPTION: 'premium_pass_monthly',
  TOKEN_25K: '25K_tokens',
  TOKEN_100K: '100K_tokens',
  TOKEN_250K: 'tokens_250k',
  TOKEN_500K: '500K_tokens',
} as const;

export const SUBSCRIPTION_PRODUCTS = [PRODUCT_IDS.SUBSCRIPTION];
export const TOKEN_PRODUCTS = [
  PRODUCT_IDS.TOKEN_25K,
  PRODUCT_IDS.TOKEN_100K,
  PRODUCT_IDS.TOKEN_250K,
  PRODUCT_IDS.TOKEN_500K
];
export const ALL_PRODUCT_IDS = [...SUBSCRIPTION_PRODUCTS, ...TOKEN_PRODUCTS];

/**
 * Utility functions for product information
 */
export const getProductById = (productId: string): IAPProduct | undefined => {
  return IAP_PRODUCTS[productId];
};

export const getTokenAmountForProduct = (productId: string): number => {
  const product = getProductById(productId);
  return product?.tokens || 0;
};

export const isSubscriptionProduct = (productId: string): boolean => {
  const product = getProductById(productId);
  return product?.type === 'subscription';
};

export const isTokenProduct = (productId: string): boolean => {
  const product = getProductById(productId);
  return product?.type === 'consumable';
};

export const getSubscriptionGroupForProduct = (productId: string): SubscriptionGroup | undefined => {
  return SUBSCRIPTION_GROUPS.find(group => 
    group.products.includes(productId)
  );
};

/**
 * React Native IAP Configuration
 */
export const RNIAP_CONFIG = {
  // Products that need to be finished as consumable
  consumableProducts: TOKEN_PRODUCTS,
  
  // Products that are auto-renewable subscriptions
  subscriptionProducts: SUBSCRIPTION_PRODUCTS,
  
  // Connection settings
  connectTimeout: 10000, // 10 seconds
  retryCount: 3,
} as const;

/**
 * Development/Debug Configuration
 */
export const DEBUG_CONFIG = {
  enableLogging: __DEV__,
  enableTestPurchases: __DEV__,
  skipReceiptValidation: false, // Never skip in production
} as const;
