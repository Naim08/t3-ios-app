import React, { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import RNIap, { initConnection, getProducts } from 'react-native-iap';

const PRODUCT_ID = 'premium_pass_monthly';

export const IAPTestScreen = () => {
  const [status, setStatus] = useState('Not connected');
  const [products, setProducts] = useState<any[]>([]);

  const testConnection = async () => {
    try {
      setStatus('Connecting...');
      const result = await initConnection();
      setStatus(`Connected: ${result}`);
      
      // Try to get products
      const availableProducts = await getProducts({ skus: [PRODUCT_ID] });
      setProducts(availableProducts);
      
      if (availableProducts.length > 0) {
        setStatus('✅ Product found!');
      } else {
        setStatus('❌ Product not found - check App Store Connect');
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>IAP Connection Test</Text>
      <Text>Status: {status}</Text>
      <Button title="Test Connection" onPress={testConnection} />
      
      {products.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text>Products found:</Text>
          {products.map((product, index) => (
            <Text key={index}>
              {product.productId} - {product.localizedPrice}
            </Text>
          ))}
        </View>
      )}
      
      <View style={{ marginTop: 20 }}>
        <Text>Expected Product ID: {PRODUCT_ID}</Text>
        <Text>If product not found:</Text>
        <Text>1. Check App Store Connect</Text>
        <Text>2. Wait 2-24 hours for propagation</Text>
        <Text>3. Ensure agreements are signed</Text>
      </View>
    </View>
  );
};
