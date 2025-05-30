import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import RNIap, { initConnection, requestSubscription, endConnection } from 'react-native-iap';

export const SandboxLoginTest: React.FC = () => {
  const [status, setStatus] = useState('Ready to test');
  const [isLoading, setIsLoading] = useState(false);

  const testSandboxLogin = async () => {
    setIsLoading(true);
    setStatus('Testing sandbox login...');
    
    try {
      // Initialize IAP
      await initConnection();
      setStatus('Connected, attempting purchase...');
      
      // This will trigger the Apple ID login prompt
      await requestSubscription({
        sku: 'premium_pass_monthly',
      });
      
      setStatus('✅ Sandbox login successful!');
      Alert.alert('Success!', 'Sandbox test account login worked. You should be signed in now.');
      
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        setStatus('❌ User cancelled - try again to login');
        Alert.alert('Cancelled', 'Purchase cancelled. The login prompt should have appeared though.');
      } else {
        setStatus(`❌ Error: ${error.message}`);
        Alert.alert('Error', `Test failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
      try {
        await endConnection();
      } catch {}
    }
  };

  const checkCurrentAccount = () => {
    Alert.alert(
      'Check Sandbox Account', 
      'Go to Settings → App Store\n\nIf you see a sandbox account email, you\'re logged in.\n\nIf you see "Sign In", you need to trigger a purchase to login.'
    );
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>iOS Only</Text>
        <Text>Sandbox testing is iOS-specific</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍎 Sandbox Login Test</Text>
      <Text style={styles.status}>Status: {status}</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.disabled]}
        onPress={testSandboxLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Sandbox Login'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]}
        onPress={checkCurrentAccount}
      >
        <Text style={[styles.buttonText, styles.secondaryText]}>
          Check Current Account
        </Text>
      </TouchableOpacity>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>📋 Instructions:</Text>
        <Text style={styles.instruction}>1. Make sure you're signed OUT of production Apple ID in Settings → App Store</Text>
        <Text style={styles.instruction}>2. Tap "Test Sandbox Login" above</Text>
        <Text style={styles.instruction}>3. When prompted, sign in with your sandbox test account</Text>
        <Text style={styles.instruction}>4. You can cancel the purchase - we just need the login</Text>
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          ⚠️ Never sign into sandbox accounts through Settings → App Store directly. 
          Always let the purchase flow trigger the login.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  disabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryText: {
    color: '#007AFF',
  },
  instructions: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 5,
    paddingLeft: 10,
  },
  warning: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
  },
});