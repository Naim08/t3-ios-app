import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import RNIap, {
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  getAvailablePurchases,
  getPendingPurchasesIOS, // Specific to iOS
  Product,
  Subscription,
  Purchase, // For available and pending purchases
} from 'react-native-iap';

// Define the product IDs that should be fetched for debugging.
// These must match the IDs configured in App Store Connect and Google Play Console.
const DEBUG_PRODUCT_IDS = [
  'premium_pass_monthly', // Example Subscription ID
  '25K_tokens',           // Example Consumable Token Package
  '100K_tokens',          // Example Consumable Token Package
  'tokens_250k',          // Example Consumable Token Package
  '500K_tokens',          // Example Consumable Token Package
];

/**
 * Interface for the state object holding all debug information.
 */
interface DebugInfo {
  connectionStatus: string;
  products: Product[];
  subscriptions: Subscription[];
  availablePurchases: Purchase[]; // Use Purchase type for consistency
  pendingPurchases: Purchase[];   // Use Purchase type for consistency
  error: string | null;
}

/**
 * IAPDebugScreen component provides a comprehensive interface for debugging
 * In-App Purchase (IAP) setup and connectivity with Apple App Store and Google Play.
 * It directly interacts with the `react-native-iap` library to fetch product
 * information, connection status, and purchase history.
 */
export const IAPDebugScreen: React.FC = () => {
  // State to hold all the diagnostic information
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    connectionStatus: 'Not connected',
    products: [],
    subscriptions: [],
    availablePurchases: [],
    pendingPurchases: [],
    error: null,
  });
  // State to manage loading indicator during diagnostics
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Asynchronously runs a series of diagnostic checks for In-App Purchases.
   * This includes testing the connection, fetching products/subscriptions,
   * and retrieving available/pending purchases.
   */
  const runDiagnostics = useCallback(async () => {
    setIsLoading(true);
    setDebugInfo(prev => ({ ...prev, error: null })); // Clear previous errors

    try {
      console.log('🔍 IAP DIAGNOSTICS STARTING...');
      console.log('------------------------------------');
      console.log('📱 Expected App Bundle ID: org.name.pockett3');
      console.log('🔑 Expected Subscription Product ID: premium_pass_monthly');
      console.log('------------------------------------');

      // 1. Test connection to the app store
      console.log('1️⃣ Testing connection...');
      const connectionResult = await initConnection();
      console.log('✅ Connection result:', connectionResult ? 'Success' : 'Failed');

      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: `Connected: ${connectionResult ? 'True' : 'False'}`,
      }));

      // 2. Fetch all defined products (consumables and non-consumables)
      console.log('\n2️⃣ Getting products...');
      console.log('  - Requesting SKUs:', DEBUG_PRODUCT_IDS.join(', '));
      try {
        const products = await getProducts({ skus: DEBUG_PRODUCT_IDS });
        console.log('📦 Products Response Details:');
        console.log(`  - Found ${products?.length || 0} products.`);
        // Log raw product data for deep inspection
        console.log('  - Raw products data:', JSON.stringify(products, null, 2));

        if (products && products.length > 0) {
          products.forEach((product, index) => {
            console.log(`  --- Product ${index + 1} ---`);
            console.log(`    - ID: ${product.productId}`);
            console.log(`    - Type: ${product.type || 'Unknown'}`); // 'type' is useful for debugging
            console.log(`    - Title: ${product.title}`);
            console.log(`    - Description: ${product.description}`);
            console.log(`    - Price: ${product.localizedPrice} (${product.currency})`);
          });
        } else {
          console.warn('⚠️ NO PRODUCTS FOUND for the provided SKUs!');
          console.warn('  Possible causes:');
          console.warn('  1. Bundle ID mismatch (app vs App Store Connect/Google Play Console).');
          console.warn('  2. Products not approved/active in App Store Connect/Google Play Console.');
          console.warn('  3. Products not available in your test account region/sandbox environment.');
          console.warn('  4. Incorrect product IDs in DEBUG_PRODUCT_IDS array.');
          console.warn('  5. For Android, ensure the app is uploaded to a test track.');
          console.warn('  6. For iOS, ensure you are signed in with a Sandbox Tester account.');
        }

        setDebugInfo(prev => ({ ...prev, products }));
      } catch (productError: any) {
        console.error('❌ Error fetching products:', productError);
        console.error('  Error code:', productError.code);
        console.error('  Error message:', productError.message);
        throw new Error(`Failed to fetch products: ${productError.message}`);
      }

      // 3. Fetch subscriptions specifically (though getProducts can also return them)
      console.log('\n3️⃣ Getting subscriptions...');
      // Filter DEBUG_PRODUCT_IDS for known subscription IDs if you have a separate list
      const subscriptionSkus = DEBUG_PRODUCT_IDS.filter(id => id === 'premium_pass_monthly');
      try {
        const subscriptions = await getSubscriptions({ skus: subscriptionSkus });
        console.log(`  - Found ${subscriptions?.length || 0} subscriptions.`);
        console.log('  - Raw subscriptions data:', JSON.stringify(subscriptions, null, 2));
        setDebugInfo(prev => ({ ...prev, subscriptions }));
      } catch (subError: any) {
        console.error('❌ Error fetching subscriptions:', subError);
        // Don't throw here, as subscriptions might fail independently of products
      }

      // 4. Get previously purchased items that are still active or can be restored
      console.log('\n4️⃣ Getting available purchases (restorable/active non-consumables/subscriptions)...');
      try {
        const availablePurchases = await getAvailablePurchases();
        console.log(`  - Found ${availablePurchases?.length || 0} available purchases.`);
        console.log('  - Raw available purchases data:', JSON.stringify(availablePurchases, null, 2));
        setDebugInfo(prev => ({ ...prev, availablePurchases }));
      } catch (availableError: any) {
        console.error('❌ Error fetching available purchases:', availableError);
      }

      // 5. Get pending purchases (specifically for iOS, for deferred transactions)
      console.log('\n5️⃣ Getting pending purchases (iOS only)...');
      let pendingPurchases: Purchase[] = [];
      if (Platform.OS === 'ios') {
        try {
          pendingPurchases = await getPendingPurchasesIOS();
          console.log(`  - Found ${pendingPurchases?.length || 0} pending purchases.`);
          console.log('  - Raw pending purchases data:', JSON.stringify(pendingPurchases, null, 2));
        } catch (pendingError: any) {
          console.error('❌ Error fetching pending purchases (iOS):', pendingError);
        }
      } else {
        console.log('  - Skipping pending purchases check on Android/Web (iOS-specific).');
      }
      setDebugInfo(prev => ({ ...prev, pendingPurchases }));

      console.log('\n✅ IAP DIAGNOSTICS COMPLETE!');
      console.log('------------------------------------');

    } catch (error: any) {
      console.error('❌ IAP DIAGNOSTICS FAILED ENTIRELY:', error);
      setDebugInfo(prev => ({
        ...prev,
        error: `Diagnostics failed: ${error.message || 'Unknown error occurred.'}`,
      }));
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array as runDiagnostics doesn't depend on external state

  /**
   * Clears the RNIap connection. Useful for resetting the state and
   * re-running diagnostics from a clean slate.
   */
  const clearConnection = useCallback(async () => {
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
      console.log('✅ IAP connection ended and debug info cleared.');
    } catch (error: any) {
      Alert.alert('Error', `Failed to clear connection: ${error.message}`);
      console.error('❌ Error clearing IAP connection:', error);
    }
  }, []); // Empty dependency array as clearConnection doesn't depend on external state

  /**
   * Displays an Alert with detailed information about a specific product.
   */
  const showProductDetails = useCallback((product: Product) => {
    Alert.alert(
      'Product Details',
      `ID: ${product.productId}\n` +
      `Title: ${product.title}\n` +
      `Description: ${product.description}\n` +
      `Price: ${product.localizedPrice} (${product.currency})\n` +
      `Type: ${product.type || 'Unknown'}`
    );
  }, []); // Empty dependency array as showProductDetails doesn't depend on external state

  // Effect to run diagnostics on component mount and clean up on unmount
  useEffect(() => {
    runDiagnostics(); // Run diagnostics automatically on first render

    return () => {
      // Ensure connection is ended when the component unmounts
      endConnection().catch(e => console.error('Error ending connection on unmount:', e));
      console.log('🧹 IAPDebugScreen unmounted: connection ended.');
    };
  }, [runDiagnostics]); // Depend on runDiagnostics to ensure it's called once.

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🛒 IAP Debug Information</Text>

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
          onPress={clearConnection}
          disabled={isLoading} // Disable while diagnostics are running
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
        <Text style={styles.infoText}>• Bundle ID: <Text style={styles.highlightText}>org.name.pockett3</Text></Text>
        <Text style={styles.infoText}>• Expected Subscription: <Text style={styles.highlightText}>premium_pass_monthly</Text></Text>
        <Text style={styles.helpText}>
          ⚠️ <Text style={styles.boldText}>Important:</Text> The bundle ID in your app must exactly match the bundle ID
          configured in App Store Connect / Google Play Console for your IAP products to be found.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <Text style={styles.infoText}>{debugInfo.connectionStatus}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Products Found ({debugInfo.products.length})</Text>
        {debugInfo.products.length > 0 ? (
          debugInfo.products.map((product, index) => (
            <TouchableOpacity
              key={product.productId || index} // Use productId as key if available, fallback to index
              style={styles.itemContainer}
              onPress={() => showProductDetails(product)}
            >
              <Text style={styles.itemTitle}>✅ {product.productId}</Text>
              <Text style={styles.itemSubtitle}>{product.title} - {product.localizedPrice}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No products found. See troubleshooting tips below.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscriptions Found ({debugInfo.subscriptions.length})</Text>
        {debugInfo.subscriptions.length > 0 ? (
          debugInfo.subscriptions.map((sub, index) => (
            <TouchableOpacity
              key={sub.productId || index}
              style={styles.itemContainer}
              onPress={() => showProductDetails(sub as Product)} // Cast to Product for details
            >
              <Text style={styles.itemTitle}>✅ {sub.productId}</Text>
              <Text style={styles.itemSubtitle}>
                {sub.title} - {sub.localizedPrice || 'Price not available'}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No subscriptions found.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Purchases ({debugInfo.availablePurchases.length})</Text>
        {debugInfo.availablePurchases.length > 0 ? (
          debugInfo.availablePurchases.map((purchase, index) => (
            <View key={purchase.transactionId || index} style={styles.itemContainer}>
              <Text style={styles.itemTitle}>📦 {purchase.productId}</Text>
              <Text style={styles.itemSubtitle}>Transaction ID: {purchase.transactionId}</Text>
              <Text style={styles.itemSubtitle}>Purchase Date: {purchase.transactionDate ? new Date(parseInt(purchase.transactionDate)).toLocaleDateString() : 'N/A'}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No available (restorable) purchases found for the current user.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Purchases ({debugInfo.pendingPurchases.length})</Text>
        <Text style={styles.infoText}>(iOS only for deferred transactions)</Text>
        {debugInfo.pendingPurchases.length > 0 ? (
          debugInfo.pendingPurchases.map((purchase, index) => (
            <View key={purchase.transactionId || index} style={styles.itemContainer}>
              <Text style={styles.itemTitle}>⏳ {purchase.productId}</Text>
              <Text style={styles.itemSubtitle}>Transaction ID: {purchase.transactionId}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No pending purchases found.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Troubleshooting & Tips</Text>
        <Text style={styles.helpText}>
          <Text style={styles.boldText}>1. Test Accounts:</Text> Ensure you are logged in with a valid test account (Sandbox for iOS, License tester for Android).
          {'\n\n'}<Text style={styles.boldText}>2. Product Configuration:</Text>
          {'\n'}   • Verify all product IDs (`DEBUG_PRODUCT_IDS`) match <Text style={styles.highlightText}>exactly</Text> with your store listings.
          {'\n'}   • Products can take <Text style={styles.boldText}>2-24 hours</Text> to propagate after creation/changes in App Store Connect/Google Play Console.
          {'\n'}   • Ensure products are <Text style={styles.boldText}>"Ready to Submit"</Text> (iOS) or <Text style={styles.boldText}>"Active"</Text> (Android) and associated with your app version.
          {'\n\n'}<Text style={styles.boldText}>3. Agreements:</Text> Check your developer agreements are signed and up-to-date in your developer consoles.
          {'\n\n'}<Text style={styles.boldText}>4. App Signing/Upload:</Text>
          {'\n'}   • For iOS, ensure your app is signed with a distribution profile for testing (not a development profile).
          {'\n'}   • For Android, ensure your app is uploaded to a test track (internal, alpha, beta) and the version is live.
          {'\n\n'}<Text style={styles.boldText}>5. Clear Cache:</Text> Use the "Clear IAP Connection" button to reset the RNIap state if you encounter persistent issues.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5', // Light background
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 25,
    color: '#2c3e50', // Darker text for contrast
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 25,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#007AFF', // iOS blue
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  errorContainer: {
    backgroundColor: '#ffebee', // Light red background
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#f44336', // Red border
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f', // Darker red
    marginBottom: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#34495e', // Slightly darker blue-grey
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 6,
  },
  itemContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: 'bold',
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
});