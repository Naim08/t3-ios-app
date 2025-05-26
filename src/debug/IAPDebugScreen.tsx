import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import RNIap, {
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  getAvailablePurchases,
  getPendingPurchasesIOS,
  Product,
  Subscription,
} from 'react-native-iap';

const DEBUG_PRODUCT_IDS = [
  'premium_pass_monthly', // Subscription
  '25K_tokens',           // 25K Token Package
  '100K_tokens',          // 100K Token Package  
  'tokens_250k',          // 250K Token Package
  '500K_tokens',          // 500K Token Package
];

interface DebugInfo {
  connectionStatus: string;
  products: Product[];
  subscriptions: Subscription[];
  availablePurchases: any[];
  pendingPurchases: any[];
  error: string | null;
}

export const IAPDebugScreen: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    connectionStatus: 'Not connected',
    products: [],
    subscriptions: [],
    availablePurchases: [],
    pendingPurchases: [],
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setDebugInfo(prev => ({ ...prev, error: null }));

    try {
      console.log('🔍 IAP DIAGNOSTICS STARTING...');
      console.log('📱 App Bundle ID: com.smartbot.superchat');
      console.log('🔑 Expected Product ID: premium_pass_monthly');
      console.log('');
      
      // 1. Test connection
      console.log('1️⃣ Testing connection...');
      const connectionResult = await initConnection();
      console.log('✅ Connection result:', connectionResult);
      
      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: `Connected: ${connectionResult}`,
      }));

      // 2. Get products with detailed logging
      console.log('2️⃣ Getting products...');
      console.log('  - Requesting SKUs:', DEBUG_PRODUCT_IDS);
      try {
        const products = await getProducts({ skus: DEBUG_PRODUCT_IDS });
        console.log('📦 Products Response:');
        console.log('  - Products found:', products?.length || 0);
        console.log('  - Raw products data:', JSON.stringify(products, null, 2));
        
        if (products && products.length > 0) {
          products.forEach((product, index) => {
            console.log(`  Product ${index + 1}:`);
            console.log(`    - ID: ${product.productId}`);
            console.log(`    - Title: ${product.title}`);
            console.log(`    - Description: ${product.description}`);
            console.log(`    - Price: ${product.localizedPrice}`);
            console.log(`    - Currency: ${product.currency}`);
            console.log(`    - Type: ${product.type || 'Unknown'}`);
          });
        } else {
          console.warn('⚠️ NO PRODUCTS FOUND!');
          console.warn('  Possible causes:');
          console.warn('  1. Bundle ID mismatch (app vs App Store Connect)');
          console.warn('  2. Product not approved in App Store Connect');
          console.warn('  3. Product not available in sandbox/region');
          console.warn('  4. Incorrect product ID');
        }
        
        setDebugInfo(prev => ({ ...prev, products }));
      } catch (productError: any) {
        console.error('❌ Product error:', productError);
        console.error('  Error code:', productError.code);
        console.error('  Error message:', productError.message);
        throw new Error(`Products failed: ${productError.message}`);
      }

      // 3. Get subscriptions
      console.log('3️⃣ Getting subscriptions...');
      try {
        const subscriptions = await getSubscriptions({ skus: DEBUG_PRODUCT_IDS });
        console.log('Subscriptions found:', subscriptions);
        setDebugInfo(prev => ({ ...prev, subscriptions }));
      } catch (subError) {
        console.error('Subscription error:', subError);
        // Don't throw here, subscriptions might fail while products work
      }

      // 4. Get available purchases
      console.log('4️⃣ Getting available purchases...');
      try {
        const availablePurchases = await getAvailablePurchases();
        console.log('Available purchases:', availablePurchases);
        setDebugInfo(prev => ({ ...prev, availablePurchases }));
      } catch (availableError) {
        console.error('Available purchases error:', availableError);
      }

      // 5. Get pending purchases (iOS only)
      console.log('5️⃣ Getting pending purchases...');
      try {
        const pendingPurchases = await getPendingPurchasesIOS();
        console.log('Pending purchases:', pendingPurchases);
        setDebugInfo(prev => ({ ...prev, pendingPurchases }));
      } catch (pendingError) {
        console.error('Pending purchases error:', pendingError);
      }

      console.log('✅ IAP diagnostics complete');
      
    } catch (error: any) {
      console.error('❌ IAP diagnostics failed:', error);
      setDebugInfo(prev => ({
        ...prev,
        error: error.message || 'Unknown error',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      await endConnection();
      setDebugInfo({
        connectionStatus: 'Disconnected',
        products: [],
        subscriptions: [],
        availablePurchases: [],
        pendingPurchases: [],
        error: null,
      });
      Alert.alert('Success', 'IAP connection cleared. Run diagnostics again to reconnect.');
    } catch (error: any) {
      Alert.alert('Error', `Failed to clear connection: ${error.message}`);
    }
  };

  const showProductDetails = (product: Product) => {
    Alert.alert(
      'Product Details',
      `ID: ${product.productId}\nTitle: ${product.title}\nDescription: ${product.description}\nPrice: ${product.localizedPrice}\nCurrency: ${product.currency}`
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>IAP Debug Information</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runDiagnostics}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Running Diagnostics...' : 'Run IAP Diagnostics'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={clearCache}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Clear IAP Connection
          </Text>
        </TouchableOpacity>
      </View>

      {debugInfo.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ Error:</Text>
          <Text style={styles.errorText}>{debugInfo.error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Configuration</Text>
        <Text style={styles.infoText}>Bundle ID: com.smartbot.superchat</Text>
        <Text style={styles.infoText}>Expected Product: premium_pass_monthly</Text>
        <Text style={styles.helpText}>
          ⚠️ Important: The bundle ID in your app must exactly match the bundle ID 
          configured in App Store Connect for your IAP products.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <Text style={styles.infoText}>{debugInfo.connectionStatus}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Products ({debugInfo.products.length})</Text>
        {debugInfo.products.length > 0 ? (
          debugInfo.products.map((product, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.itemContainer}
              onPress={() => showProductDetails(product)}
            >
              <Text style={styles.itemTitle}>✅ {product.productId}</Text>
              <Text style={styles.itemSubtitle}>{product.localizedPrice}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No products found</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscriptions ({debugInfo.subscriptions.length})</Text>
        {debugInfo.subscriptions.length > 0 ? (
          debugInfo.subscriptions.map((sub, index) => (
            <View key={index} style={styles.itemContainer}>
              <Text style={styles.itemTitle}>✅ {sub.productId}</Text>
              <Text style={styles.itemSubtitle}>
                {(sub as any).localizedPrice || (sub as any).price || 'Price not available'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No subscriptions found</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Purchases ({debugInfo.availablePurchases.length})</Text>
        {debugInfo.availablePurchases.length > 0 ? (
          debugInfo.availablePurchases.map((purchase, index) => (
            <View key={index} style={styles.itemContainer}>
              <Text style={styles.itemTitle}>📦 {purchase.productId}</Text>
              <Text style={styles.itemSubtitle}>Transaction: {purchase.transactionId}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No available purchases</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Purchases ({debugInfo.pendingPurchases.length})</Text>
        {debugInfo.pendingPurchases.length > 0 ? (
          debugInfo.pendingPurchases.map((purchase, index) => (
            <View key={index} style={styles.itemContainer}>
              <Text style={styles.itemTitle}>⏳ {purchase.productId}</Text>
              <Text style={styles.itemSubtitle}>Transaction: {purchase.transactionId}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No pending purchases</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expected Product ID</Text>
        <Text style={styles.infoText}>premium_pass_monthly</Text>
        <Text style={styles.helpText}>
          If this product doesn't appear above, it may not be:
          {'\n'}• Approved by Apple
          {'\n'}• Properly configured in App Store Connect
          {'\n'}• Available in your region/sandbox
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemContainer: {
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 16,
  },
});
