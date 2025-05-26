
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../providers/AuthProvider';
import { useCredits } from '../hooks/useCredits';
import { supabase } from '../lib/supabase';
import { OfflinePurchaseQueue } from './offlineQueue';
import { 
  PRODUCT_IDS as IAP_PRODUCT_IDS, 
  ALL_PRODUCT_IDS, 
  TOKEN_PRODUCTS, 
  SUBSCRIPTION_PRODUCTS,
  APPLE_CONFIG,
  isSubscriptionProduct,
  isTokenProduct,
  getTokenAmountForProduct
} from './iapConfig';
import RNIap, {
  Product,
  ProductPurchase,
  PurchaseError as RNIapPurchaseError,
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  flushFailedPurchasesCachedAsPendingAndroid,
  clearProductsIOS,
} from 'react-native-iap';

import { 
  PurchaseError, 
  showPurchaseError, 
  showPurchaseSuccess, 
  showRestoreSuccess, 
  showRestoreInfo 
} from './errors';

export interface SubscriptionStatus {
  isActive: boolean;
  expirationDate: string | null;
  productId: string | null;
}

export interface PurchaseContextType {
  subscriptionStatus: SubscriptionStatus;
  isLoading: boolean;
  error: string | null;
  subscriptionProduct: Product | null;
  tokenProducts: Product[];
  purchaseSubscription: () => Promise<void>;
  purchaseTokens: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

interface PurchaseProviderProps {
  children: ReactNode;
}

// Product IDs - must match exactly with App Store Connect
const SUBSCRIPTION_ID = IAP_PRODUCT_IDS.SUBSCRIPTION;
const TOKEN_25K_ID = IAP_PRODUCT_IDS.TOKEN_25K;
const TOKEN_100K_ID = IAP_PRODUCT_IDS.TOKEN_100K;
const TOKEN_250K_ID = IAP_PRODUCT_IDS.TOKEN_250K;
const TOKEN_500K_ID = IAP_PRODUCT_IDS.TOKEN_500K;

export const PurchaseProvider: React.FC<PurchaseProviderProps> = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActive: false,
    expirationDate: null,
    productId: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionProduct, setSubscriptionProduct] = useState<Product | null>(null);
  const [tokenProducts, setTokenProducts] = useState<Product[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  const { user } = useAuth();
  const { refetch: refetchCredits } = useCredits();
  const offlineQueue = OfflinePurchaseQueue.getInstance();
  
  // Use refs to track listeners and prevent memory leaks
  const purchaseUpdateSubscription = useRef<any>(null);
  const purchaseErrorSubscription = useRef<any>(null);
  const initializationRef = useRef<boolean>(false);

  // CRITICAL FIX #1: Proper listener cleanup and re-setup
  const setupPurchaseListeners = useCallback(() => {
    // Clean up existing listeners first
    if (purchaseUpdateSubscription.current) {
      purchaseUpdateSubscription.current.remove();
      purchaseUpdateSubscription.current = null;
    }
    if (purchaseErrorSubscription.current) {
      purchaseErrorSubscription.current.remove();
      purchaseErrorSubscription.current = null;
    }

    // Set up new listeners
    purchaseUpdateSubscription.current = purchaseUpdatedListener(handlePurchaseUpdate);
    purchaseErrorSubscription.current = purchaseErrorListener(handlePurchaseError);
    
    console.log('✅ Purchase listeners set up');
  }, []);

  // CRITICAL FIX #2: Immediate transaction finishing
  const handlePurchaseUpdate = useCallback(async (purchase: ProductPurchase) => {
    console.log('✅ Processing purchase update:', purchase.productId);
    
    try {
      // FINISH TRANSACTION IMMEDIATELY to prevent stuck purchases
      const isConsumable = isTokenProduct(purchase.productId);
      await finishTransaction({
        purchase,
        isConsumable,
      });
      console.log('✅ Transaction finished immediately');

      if (!user) {
        console.error('❌ No user available for purchase processing');
        return;
      }

      const receipt = purchase.transactionReceipt;
      if (receipt) {
        const success = await validateReceipt(purchase, user.id);
        if (success) {
          console.log('✅ Purchase validated and processed successfully');
        }
      } else {
        console.error('❌ No receipt found in purchase');
        showPurchaseError(new PurchaseError({
          message: 'No receipt found',
          userFriendlyMessage: 'Purchase failed - no receipt found. Please contact support.',
        }));
      }
    } catch (error) {
      console.error('❌ Error processing purchase update:', error);
      showPurchaseError(new PurchaseError({
        message: 'Failed to process purchase',
        userFriendlyMessage: 'Purchase failed to process. Please contact support if this persists.',
      }));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handlePurchaseError = useCallback((error: RNIapPurchaseError) => {
    console.error('❌ Purchase error from listener:', error);
    
    if (error.code === 'E_USER_CANCELLED') {
      console.log('ℹ️ User cancelled purchase');
    } else {
      showPurchaseError(new PurchaseError({
        code: error.code,
        message: error.message,
        userFriendlyMessage: 'Purchase failed. Please try again.',
      }));
    }
    
    setIsLoading(false);
  }, []);

  // CRITICAL FIX #3: Separate product fetching with proper error handling
  const fetchProducts = useCallback(async (): Promise<{ subscriptionProduct: Product | null; tokenProducts: Product[] }> => {
    let subscriptionProduct: Product | null = null;
    let tokenProducts: Product[] = [];

    try {
      // Fetch subscriptions separately
      console.log('📦 Fetching subscription products...');
      const subscriptions = await getSubscriptions({ skus: SUBSCRIPTION_PRODUCTS });
      
      if (subscriptions && subscriptions.length > 0) {
        subscriptionProduct = subscriptions[0] as unknown as Product;
        console.log('✅ Found subscription:', subscriptionProduct.productId);
      }
    } catch (error) {
      console.error('❌ Failed to fetch subscriptions:', error);
    }

    try {
      // Fetch consumable products separately
      console.log('📦 Fetching token products...');
      const products = await getProducts({ 
        skus: TOKEN_PRODUCTS
      });
      
      if (products && products.length > 0) {
        tokenProducts = products;
        console.log('✅ Found token products:', products.length);
      }
    } catch (error) {
      console.error('❌ Failed to fetch products:', error);
    }

    return { subscriptionProduct, tokenProducts };
  }, []);

  // CRITICAL FIX #4: Single initialization with proper state management
  const initializePurchases = useCallback(async () => {
    if (initializationRef.current || !user) return;
    
    try {
      initializationRef.current = true;
      setIsLoading(true);
      console.log('🚀 Starting IAP initialization...');
      
      await initConnection();
      console.log('✅ Connected to store');

      // Platform-specific cleanup
      if (Platform.OS === 'android') {
        await flushFailedPurchasesCachedAsPendingAndroid();
      }
      if (Platform.OS === 'ios') {
        clearProductsIOS();
      }

      // Set up listeners
      setupPurchaseListeners();

      // Fetch products
      const { subscriptionProduct, tokenProducts } = await fetchProducts();
      
      setSubscriptionProduct(subscriptionProduct);
      setTokenProducts(tokenProducts);
      setIsInitialized(true);
      setError(null);
      
      console.log('✅ IAP initialization complete');
    } catch (error: any) {
      console.error('❌ Failed to initialize purchases:', error);
      setError('Failed to initialize purchases');
    } finally {
      setIsLoading(false);
    }
  }, [user, setupPurchaseListeners, fetchProducts]);

  // CRITICAL FIX #5: Effect cleanup and proper dependency management
  useEffect(() => {
    if (user && !isInitialized) {
      initializePurchases();
    }
  }, [user, isInitialized, initializePurchases]);

  // CRITICAL FIX #6: Fixed validateReceipt with proper error handling
  const validateReceipt = useCallback(async (purchase: ProductPurchase, userId: string): Promise<boolean> => {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (!netInfo.isConnected) {
        await offlineQueue.addPendingPurchase({
          receiptData: purchase.transactionReceipt || '',
          userId,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        });
        
        showRestoreInfo('Purchase saved offline. It will be processed when internet is available.');
        return true;
      }

      const { data, error } = await supabase.functions.invoke('validate_receipt', {
        body: {
          receipt_data: purchase.transactionReceipt,
          user_id: userId,
          product_id: purchase.productId,
          transaction_id: purchase.transactionId,
          platform: Platform.OS,
        },
      });

      if (error) {
        throw new PurchaseError({
          message: error.message,
          userFriendlyMessage: 'Failed to validate purchase. Please try again.',
        });
      }

      if (data.success) {
        console.log('Receipt validated successfully:', data);
        
        if (purchase.productId === SUBSCRIPTION_ID) {
          setSubscriptionStatus(prev => ({
            ...prev,
            isActive: true,
            productId: purchase.productId,
          }));
        }
        
        await refetchCredits();
        
        if (data.tokensAdded) {
          showPurchaseSuccess(`${data.tokensAdded.toLocaleString()} tokens added to your account!`);
        }

        return true;
      } else if (data.alreadyProcessed) {
        console.log('Receipt already processed');
        return true;
      } else {
        throw new PurchaseError({
          message: data.error || 'Receipt validation failed',
          userFriendlyMessage: 'Purchase validation failed. Please contact support if this persists.',
        });
      }
    } catch (error) {
      console.error('Error validating receipt:', error);
      if (error instanceof PurchaseError) {
        showPurchaseError(error);
      } else {
        showPurchaseError(new PurchaseError({
          message: 'Unknown validation error',
          userFriendlyMessage: 'Failed to validate purchase. Please contact support.',
        }));
      }
      return false;
    }
  }, [refetchCredits, offlineQueue]);

  // CRITICAL FIX #7: Simplified purchase methods with proper error handling
  const purchaseSubscription = useCallback(async () => {
    if (!subscriptionProduct || !user) {
      const errorMsg = !user ? 'Please sign in to purchase' : 'Subscription product not available';
      showPurchaseError(new PurchaseError({
        message: errorMsg,
        userFriendlyMessage: errorMsg,
      }));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🛒 Requesting subscription for product:', subscriptionProduct.productId);
      
      // The purchase will be handled by listeners
      requestSubscription({
        sku: subscriptionProduct.productId,
      });
      
    } catch (error) {
      console.error('❌ Error requesting subscription:', error);
      setIsLoading(false);
      
      if (error instanceof RNIapPurchaseError && error.code !== 'E_USER_CANCELLED') {
        showPurchaseError(new PurchaseError({
          code: error.code,
          message: error.message,
          userFriendlyMessage: 'Failed to start purchase. Please try again.',
        }));
      }
    }
  }, [subscriptionProduct, user]);

  const purchaseTokens = useCallback(async (productId: string) => {
    const tokenProduct = tokenProducts.find(p => p.productId === productId);
    
    if (!tokenProduct || !user) {
      const errorMsg = !user ? 'Please sign in to purchase' : 'Token product not available';
      showPurchaseError(new PurchaseError({
        message: errorMsg,
        userFriendlyMessage: errorMsg,
      }));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🛒 Requesting token purchase for product:', tokenProduct.productId);

      // The purchase will be handled by listeners
      if (Platform.OS === 'android') {
        requestPurchase({ skus: [tokenProduct.productId] });
      } else {
        requestPurchase({ sku: tokenProduct.productId });
      }

    } catch (error) {
      console.error('❌ Error requesting token purchase:', error);
      setIsLoading(false);
      
      if (error instanceof RNIapPurchaseError && error.code !== 'E_USER_CANCELLED') {
        showPurchaseError(new PurchaseError({
          code: error.code,
          message: error.message,
          userFriendlyMessage: 'Failed to start purchase. Please try again.',
        }));
      }
    }
  }, [tokenProducts, user]);

  const restorePurchases = useCallback(async () => {
    if (!user) {
      showPurchaseError(new PurchaseError({
        message: 'User not authenticated',
        userFriendlyMessage: 'Please sign in to restore purchases',
      }));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Restoring purchases...');
      
      const availablePurchases = await getAvailablePurchases();
      
      if (availablePurchases && availablePurchases.length > 0) {
        let restoredCount = 0;
        
        for (const purchase of availablePurchases) {
          if (purchase.productId === SUBSCRIPTION_ID) {
            try {
              const success = await validateReceipt(purchase, user.id);
              if (success) {
                restoredCount++;
              }
            } catch (error) {
              console.error('Error processing restored purchase:', error);
            }
          }
        }
        
        if (restoredCount > 0) {
          showRestoreSuccess(restoredCount);
        } else {
          showRestoreInfo('No new purchases found to restore.');
        }
      } else {
        showRestoreInfo('No previous purchases found to restore.');
      }
      
    } catch (error) {
      console.error('Error restoring purchases:', error);
      showPurchaseError(new PurchaseError({
        message: 'Restore failed',
        userFriendlyMessage: 'Failed to restore purchases. Please try again.',
      }));
    } finally {
      setIsLoading(false);
    }
  }, [user, validateReceipt]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setSubscriptionStatus({
        isActive: false,
        expirationDate: null,
        productId: null,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get_user_subscription_info', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('❌ Error checking subscription status:', error);
        return;
      }

      const newStatus = {
        isActive: data?.isActive || false,
        expirationDate: data?.expirationDate || null,
        productId: data?.isActive ? SUBSCRIPTION_ID : null,
      };

      setSubscriptionStatus(newStatus);
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
    }
  }, [user]);

  // Check subscription status when initialized
  useEffect(() => {
    if (user && isInitialized) {
      checkSubscriptionStatus();
    }
  }, [user, isInitialized, checkSubscriptionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (purchaseUpdateSubscription.current) {
        purchaseUpdateSubscription.current.remove();
      }
      if (purchaseErrorSubscription.current) {
        purchaseErrorSubscription.current.remove();
      }
      if (isInitialized) {
        endConnection().catch(console.warn);
      }
    };
  }, [isInitialized]);

  const contextValue: PurchaseContextType = {
    subscriptionStatus,
    isLoading,
    error,
    subscriptionProduct,
    tokenProducts,
    purchaseSubscription,
    purchaseTokens,
    restorePurchases,
    checkSubscriptionStatus,
  };

  return (
    <PurchaseContext.Provider value={contextValue}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchase = (): PurchaseContextType => {
  const context = useContext(PurchaseContext);
  if (!context) {
    throw new Error('usePurchase must be used within a PurchaseProvider');
  }
  return context;
};