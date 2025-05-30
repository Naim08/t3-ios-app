import React from 'react';
import { SafeAreaView } from 'react-native';
import { MockIAPTester } from '../debug/MockIAPTester';

export const IAPSimulatorTestScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MockIAPTester />
    </SafeAreaView>
  );
};