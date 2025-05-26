import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../providers/AuthProvider';
import { useCredits } from '../hooks/useCredits';
import { supabase } from '../lib/supabase';
import { OfflinePurchaseQueue } from './offlineQueue';
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
  subscriptionProduct: Product | null; // Monthly Pass subscription
  tokenProducts: Product[]; // All token packages (25K, 100K, 250K, 500K)
  purchaseSubscription: () => Promise<void>; // Purchase monthly subscription
  purchaseTokens: (productId: string) => Promise<void>; // Purchase token package by ID
  restorePurchases: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

interface PurchaseProviderProps {
  children: ReactNode;
}

// Product IDs - must match exactly with App Store Connect
const SUBSCRIPTION_ID = 'premium_pass_monthly'; // Apple ID: 6746395067

// Token Package IDs
const TOKEN_25K_ID = '25K_tokens';      // Apple ID: 6746413005
const TOKEN_100K_ID = '100K_tokens';    // Apple ID: 6746396078  
const TOKEN_250K_ID = 'tokens_250k';    // Apple ID: 6746395610
const TOKEN_500K_ID = '500K_tokens';    // Apple ID: 6746412948

const PRODUCT_IDS = [
  SUBSCRIPTION_ID,
  TOKEN_25K_ID,
  TOKEN_100K_ID, 
  TOKEN_250K_ID,
  TOKEN_500K_ID
];

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
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  
  const { user } = useAuth();
  const { refetch: refetchCredits } = useCredits();
  const offlineQueue = OfflinePurchaseQueue.getInstance();

  // Purchase listener references for cleanup
  const [purchaseUpdateSubscription, setPurchaseUpdateSubscription] = useState<any>(null);
  const [purchaseErrorSubscription, setPurchaseErrorSubscription] = useState<any>(null);

  // Handle purchase updates from listeners
  const handlePurchaseUpdate = async (purchase: ProductPurchase) => {
    try {
      console.log('✅ Processing purchase update:', purchase.productId);
      
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
  };

  // Handle purchase errors from listeners  
  const handlePurchaseError = (error: RNIapPurchaseError) => {
    console.error('❌ Purchase error from listener:', error);
    
    if (error.code === 'E_USER_CANCELLED') {
      console.log('ℹ️ User cancelled purchase');
      // Don't show error for user cancellation
    } else {
      showPurchaseError(new PurchaseError({
        code: error.code,
        message: error.message,
        userFriendlyMessage: 'Purchase failed. Please try again.',
      }));
    }
    
    setIsLoading(false);
  };

  // Initialize react-native-iap only once
  useEffect(() => {
    let isMounted = true;
    
    const initializePurchases = async () => {
      // Prevent multiple initializations
      if (isInitializing || isInitialized) {
        console.log('🔄 Skipping initialization - already in progress or completed');
        return;
      }

      try {
        setIsInitializing(true);
        setIsLoading(true);
        console.log('🚀 Starting IAP initialization...');
        
        // Initialize connection to store
        const result = await initConnection();
        if (!isMounted) return;
        
        console.log('✅ Connected to store:', result);

        // Clear any cached pending purchases on Android
        if (Platform.OS === 'android') {
          try {
            await flushFailedPurchasesCachedAsPendingAndroid();
            console.log('✅ Cleared cached pending purchases on Android');
          } catch (flushError) {
            console.warn('⚠️ Could not clear cached pending purchases:', flushError);
          }
        }

        // Clear cached products on iOS for fresh product fetch (recommended by docs)
        if (Platform.OS === 'ios') {
          try {
            clearProductsIOS();
            console.log('✅ Cleared cached products on iOS');
          } catch (clearError) {
            console.warn('⚠️ Could not clear cached products on iOS:', clearError);
          }
        }

        // Set up purchase listeners
        if (!purchaseUpdateSubscription) {
          const updateSubscription = purchaseUpdatedListener((purchase: ProductPurchase) => {
            console.log('📦 Purchase updated:', purchase);
            handlePurchaseUpdate(purchase);
          });
          setPurchaseUpdateSubscription(updateSubscription);
          console.log('✅ Purchase update listener set up');
        }

        if (!purchaseErrorSubscription) {
          const errorSubscription = purchaseErrorListener((error: RNIapPurchaseError) => {
            console.log('❌ Purchase error:', error);
            handlePurchaseError(error);
          });
          setPurchaseErrorSubscription(errorSubscription);
          console.log('✅ Purchase error listener set up');
        }

        // Get available products
        console.log('🔍 Starting product retrieval...');
        console.log('  - App Bundle ID (for IAP):', 'com.smartbot.superchat');
        console.log('  - Apple Service ID (for Auth):', 'com.smartbot.superchat1');
        console.log('  - Platform:', Platform.OS);
        console.log('  - Requested Product IDs:', PRODUCT_IDS);
        console.log('  - Environment:', __DEV__ ? 'Development/Sandbox' : 'Production');
        
        // Parse products and categorize them
        let subscriptionProduct: Product | null = null;
        let tokenProducts: Product[] = [];
        
        // Try regular products first (for token packages)
        try {
          console.log('📦 Trying getProducts() for regular products...');
          const products = await getProducts({ skus: PRODUCT_IDS });
          console.log('  - getProducts() result:', products?.length || 0, 'products');
          
          if (products && products.length > 0) {
            console.log('  - Regular product details:');
            products.forEach((prod, index) => {
              console.log(`    [${index}] ID: ${prod.productId}`);
              console.log(`    [${index}] Title: ${prod.title}`);
              console.log(`    [${index}] Price: ${prod.localizedPrice}`);
              console.log(`    [${index}] Type: product`);
              
              // Categorize token products
              if ([TOKEN_25K_ID, TOKEN_100K_ID, TOKEN_250K_ID, TOKEN_500K_ID].includes(prod.productId)) {
                tokenProducts.push(prod);
              }
            });
          }
        } catch (productError) {
          console.error('❌ getProducts() failed:', productError);
        }
        
        // Try subscriptions for the subscription product
        try {
          console.log('📦 Trying getSubscriptions() for subscription products...');
          const subscriptions = await getSubscriptions({ skus: PRODUCT_IDS });
          console.log('  - getSubscriptions() result:', subscriptions?.length || 0, 'subscriptions');
          
          if (subscriptions && subscriptions.length > 0) {
            console.log('  - Subscription product details:');
            subscriptions.forEach((sub, index) => {
              console.log(`    [${index}] ID: ${sub.productId}`);
              console.log(`    [${index}] Title: ${sub.title}`);
              console.log(`    [${index}] Price: ${(sub as any).localizedPrice || (sub as any).price || 'N/A'}`);
              console.log(`    [${index}] Type: subscription`);
              
              // Categorize subscription
              if (sub.productId === SUBSCRIPTION_ID) {
                subscriptionProduct = sub as unknown as Product;
              }
            });
          }
        } catch (subscriptionError) {
          console.error('❌ getSubscriptions() failed:', subscriptionError);
        }
        
        if (!isMounted) return;
        
        console.log('📊 Final product search results:');
        console.log('  - Subscription product found:', !!subscriptionProduct);
        console.log('  - Token products found:', tokenProducts.length);
        
        if (subscriptionProduct) {
          console.log('  - Subscription product details:');
          console.log(`    ID: ${subscriptionProduct.productId}`);
          console.log(`    Title: ${subscriptionProduct.title}`);
          console.log(`    Description: ${subscriptionProduct.description}`);
          console.log(`    Price: ${subscriptionProduct.localizedPrice}`);
          console.log(`    Currency: ${subscriptionProduct.currency}`);
        }
        
        if (tokenProducts.length > 0) {
          console.log('  - Token products details:');
          tokenProducts.forEach((prod, index) => {
            console.log(`    [${index}] ID: ${prod.productId}`);
            console.log(`    [${index}] Title: ${prod.title}`);
            console.log(`    [${index}] Price: ${prod.localizedPrice}`);
          });
        }
        
        setSubscriptionProduct(subscriptionProduct);
        setTokenProducts(tokenProducts);
        
        if (subscriptionProduct || tokenProducts.length > 0) {
          setError(null); // Clear any previous errors
          console.log('✅ Products loaded successfully');
        } else {
          console.error('❌ No products found!');
          console.error('  - This usually means:');
          console.error('    1. Products not approved in App Store Connect');
          console.error('    2. Bundle ID mismatch between app and App Store Connect');
          console.error('    3. Products not available in current region/sandbox');
          console.error('    4. Incorrect product ID configuration');
          console.error(`    5. Product IDs not created in App Store Connect:`);
          console.error(`       - Subscription: "${SUBSCRIPTION_ID}"`);
          console.error(`       - Tokens: ${[TOKEN_25K_ID, TOKEN_100K_ID, TOKEN_250K_ID, TOKEN_500K_ID].join(', ')}`);
          console.error('    6. App not properly signed with correct provisioning profile');
          setError('Products not available - Check App Store Connect configuration');
        }

        setIsInitialized(true);
        console.log('✅ IAP initialization complete');
      } catch (error: any) {
        console.error('❌ Failed to initialize purchases:', error);
        if (isMounted) {
          setError('Failed to initialize purchases');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitializing(false);
        }
      }
    };

    // Only initialize if we have a user and haven't initialized yet
    if (user && !isInitialized && !isInitializing) {
      initializePurchases();
    }

    return () => {
      isMounted = false;
    };
  }, [user, isInitialized, isInitializing, purchaseUpdateSubscription, purchaseErrorSubscription]);

  // Check subscription status only when properly initialized
  useEffect(() => {
    if (user && isInitialized && !isInitializing) {
      console.log('🔍 Checking subscription status...');
      checkSubscriptionStatus();
    }
  }, [user, isInitialized, isInitializing]);

  // Set up network listener for offline queue processing - only once
  useEffect(() => {
    if (isInitialized) {
      const unsubscribe = offlineQueue.startNetworkListener();
      return unsubscribe;
    }
  }, [isInitialized, offlineQueue]);

  // Process pending purchases when app becomes active - only once
  useEffect(() => {
    if (isInitialized) {
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          console.log('📱 App became active, processing pending purchases...');
          offlineQueue.processPendingPurchases();
        }
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }
  }, [isInitialized, offlineQueue]);

  const validateReceipt = async (purchase: ProductPurchase, userId: string): Promise<boolean> => {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (!netInfo.isConnected) {
        // Add to offline queue if no internet
        await offlineQueue.addPendingPurchase({
          receiptData: purchase.transactionReceipt || '',
          userId,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        });
        
        showRestoreInfo('Purchase saved offline. It will be processed when internet is available.');
        return true; // Assume success for offline case
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
        
        // Update subscription status
        setSubscriptionStatus(prev => ({
          ...prev,
          isActive: true,
          productId: purchase.productId,
        }));
        
        // Refresh credits to show new token balance
        await refetchCredits();
        
        if (data.tokensAdded) {
          showPurchaseSuccess(`${data.tokensAdded.toLocaleString()} tokens added to your account!`);
        }

        // Finish the transaction (tokens are consumable, subscriptions are not)
        const isConsumable = [TOKEN_25K_ID, TOKEN_100K_ID, TOKEN_250K_ID, TOKEN_500K_ID].includes(purchase.productId);
        await finishTransaction({
          purchase,
          isConsumable,
        });

        return true;
      } else if (data.alreadyProcessed) {
        console.log('Receipt already processed');
        
        // Still finish the transaction (tokens are consumable)
        const isConsumable = [TOKEN_25K_ID, TOKEN_100K_ID, TOKEN_250K_ID, TOKEN_500K_ID].includes(purchase.productId);
        await finishTransaction({
          purchase,
          isConsumable,
        });
        
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
  };

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
      
      // Use requestSubscription for subscription products
      // Don't await or rely on the promise - listeners will handle the result
      await requestSubscription({
        sku: subscriptionProduct.productId,
      });
      
      console.log('📨 Subscription request sent - waiting for listener response');
      
    } catch (error) {
      console.error('❌ Error requesting subscription:', error);
      
      if (error instanceof RNIapPurchaseError) {
        if (error.code === 'E_USER_CANCELLED') {
          console.log('ℹ️ User cancelled subscription request');
          // Don't show error for user cancellation
        } else {
          showPurchaseError(new PurchaseError({
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Failed to start purchase. Please try again.',
          }));
        }
      } else {
        showPurchaseError(new PurchaseError({
          message: 'Subscription request failed',
          userFriendlyMessage: 'Failed to start purchase. Please try again.',
        }));
      }
      
      setIsLoading(false);
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

      // Use requestPurchase for one-time token purchases (with platform-specific params)
      let purchaseParams: any = {
        sku: tokenProduct.productId,
      };
      
      // Android requires skus array format
      if (Platform.OS === 'android') {
        purchaseParams = {
          skus: [tokenProduct.productId],
        };
      }
      
      await requestPurchase(purchaseParams);

      console.log('📨 Token purchase request sent - waiting for listener response');
    } catch (error) {
      console.error('❌ Error requesting token purchase:', error);
      
      if (error instanceof RNIapPurchaseError) {
        if (error.code === 'E_USER_CANCELLED') {
          console.log('ℹ️ User cancelled token purchase');
          // Don't show error for user cancellation
        } else {
          showPurchaseError(new PurchaseError({
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Failed to start purchase. Please try again.',
          }));
        }
      } else {
        showPurchaseError(new PurchaseError({
          message: 'Token purchase request failed',
          userFriendlyMessage: 'Failed to start purchase. Please try again.',
        }));
      }
      
      setIsLoading(false);
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
      
      console.log('Found existing purchases:', availablePurchases);
      
      if (availablePurchases && availablePurchases.length > 0) {
        let restoredCount = 0;
        
        // Process each existing purchase
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
        console.log('No purchases to restore');
        showRestoreInfo('No previous purchases found to restore.');
      }
      
    } catch (error) {
      console.error('Error restoring purchases:', error);
      
      if (error instanceof RNIapPurchaseError) {
        showPurchaseError(new PurchaseError({
          message: error.message,
          userFriendlyMessage: 'Failed to restore purchases. Please try again.',
        }));
      } else {
        showPurchaseError(new PurchaseError({
          message: 'Restore failed',
          userFriendlyMessage: 'Failed to restore purchases. Please try again.',
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, validateReceipt]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user || isInitializing) {
      setSubscriptionStatus({
        isActive: false,
        expirationDate: null,
        productId: null,
      });
      return;
    }

    try {
      console.log('🔍 Checking subscription status for user:', user.id);
      
      // Check with your backend for subscription status
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

      console.log('✅ Subscription status updated:', newStatus);
      setSubscriptionStatus(newStatus);
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
    }
  }, [user, isInitializing]);

  // Cleanup IAP connection and listeners on unmount
  useEffect(() => {
    return () => {
      if (isInitialized) {
        console.log('🧹 Cleaning up IAP connection and listeners...');
        
        // Remove purchase listeners
        if (purchaseUpdateSubscription) {
          purchaseUpdateSubscription.remove();
          console.log('✅ Purchase update listener removed');
        }
        if (purchaseErrorSubscription) {
          purchaseErrorSubscription.remove();
          console.log('✅ Purchase error listener removed');
        }
        
        // End IAP connection
        endConnection().catch(error => {
          console.warn('⚠️ Error ending IAP connection:', error);
        });
      }
    };
  }, [isInitialized, purchaseUpdateSubscription, purchaseErrorSubscription]);

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