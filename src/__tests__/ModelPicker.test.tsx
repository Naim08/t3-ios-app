import React from 'react';
import { render } from '@testing-library/react-native';
import { ModelPickerSheet } from '../models/ModelPickerSheet';
import { EntitlementsProvider } from '../context/EntitlementsProvider';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (key === 'models.remainingTokens' && params?.count) {
        return `${params.count} tokens remaining this month`;
      }
      return key;
    },
  }),
}));

// Mock bottom sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const BottomSheet = ({ children }: any) => {
    return (
      <div data-testid="bottom-sheet">
        {children}
      </div>
    );
  };
  
  BottomSheet.BottomSheetView = ({ children }: any) => {
    return <div data-testid="bottom-sheet-view">{children}</div>;
  };
  
  return BottomSheet;
});

// Simple test to generate snapshot
test('ModelPickerSheet renders correctly', () => {
  const mockProps = {
    isVisible: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    onNavigateToPaywall: jest.fn(),
    remainingTokens: 25000,
  };

  const { toJSON } = render(
    <ThemeProvider>
      <EntitlementsProvider>
        <ModelPickerSheet {...mockProps} />
      </EntitlementsProvider>
    </ThemeProvider>
  );
  
  expect(toJSON()).toMatchSnapshot();
});
