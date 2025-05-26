// IAP Status Verification Script
// Use this in your app to verify IAP setup once approved

import RNIap, { initConnection, getProducts } from 'react-native-iap';

const PRODUCT_ID = 'premium_pass_monthly';

export const verifyIAPSetup = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('🔄 Starting IAP verification...');
    
    // Step 1: Initialize connection
    console.log('Step 1: Initializing connection...');
    const connectionResult = await initConnection();
    console.log('✅ Connection result:', connectionResult);
    
    // Step 2: Fetch products
    console.log('Step 2: Fetching products...');
    const products = await getProducts({ skus: [PRODUCT_ID] });
    console.log('📦 Products found:', products);
    
    // Step 3: Verify product details
    if (products && products.length > 0) {
      const product = products[0];
      const details = {
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        localizedPrice: product.localizedPrice,
        currency: product.currency,
      };
      
      console.log('✅ Product details:', details);
      
      return {
        success: true,
        message: `IAP setup verified! Product "${product.title}" available for ${product.localizedPrice}`,
        details,
      };
    } else {
      return {
        success: false,
        message: `Product ${PRODUCT_ID} not found. This usually means:
        1. Product not yet approved by Apple
        2. Product not submitted for review
        3. App Store Connect configuration incomplete
        4. Regional availability issues`,
      };
    }
    
  } catch (error: any) {
    console.error('❌ IAP verification failed:', error);
    
    let message = 'IAP verification failed: ';
    if (error.code === 'E_SERVICE_ERROR') {
      message += 'App Store service error. Try again later.';
    } else if (error.code === 'E_NETWORK_ERROR') {
      message += 'Network error. Check internet connection.';
    } else if (error.code === 'E_USER_ERROR') {
      message += 'User not signed into App Store.';
    } else {
      message += error.message || 'Unknown error';
    }
    
    return {
      success: false,
      message,
      details: {
        error: error.code,
        message: error.message,
      },
    };
  }
};

// Usage example:
export const runIAPVerification = async () => {
  const result = await verifyIAPSetup();
  
  if (result.success) {
    console.log('🎉', result.message);
    console.log('📝 Details:', result.details);
  } else {
    console.warn('⚠️', result.message);
    if (result.details) {
      console.log('🔍 Error details:', result.details);
    }
  }
  
  return result;
};
