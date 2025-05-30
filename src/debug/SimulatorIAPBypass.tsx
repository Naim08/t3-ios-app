import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { usePurchase } from '../purchases/PurchaseProvider';

/**
 * Simulator IAP Bypass - Only for development
 * Provides mock purchase buttons when real IAP isn't available
 */
export const SimulatorIAPBypass: React.FC = () => {
  const { subscriptionProduct, tokenProducts, isLoading } = usePurchase();

  const mockPurchase = (productId: string) => {
    console.log(`🎭 Mock purchase initiated for: ${productId}`);
    // You could trigger the MockIAPTester here
    // or call your webhook test function
  };

  if (Platform.OS !== 'ios') {
    return null; // Only show on iOS
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎭 Simulator Mode</Text>
      <Text style={styles.subtitle}>Real IAP not available on simulator</Text>
      
      {subscriptionProduct && (
        <TouchableOpacity 
          style={[styles.button, styles.subscriptionButton]}
          onPress={() => mockPurchase(subscriptionProduct.productId)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            Mock Subscribe - {subscriptionProduct.productId}
          </Text>
        </TouchableOpacity>
      )}

      {tokenProducts.map((product) => (
        <TouchableOpacity 
          key={product.productId}
          style={[styles.button, styles.tokenButton]}
          onPress={() => mockPurchase(product.productId)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            Mock Buy - {product.productId}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.note}>
        Use physical device for real IAP testing
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFF3E0',
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  subscriptionButton: {
    backgroundColor: '#4CAF50',
  },
  tokenButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});