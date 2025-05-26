import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmailOTPModal } from '../EmailOTPModal';

// Mock all the external dependencies
jest.mock('../../providers/AuthProvider', () => ({
  useAuth: () => ({
    signInWithEmail: jest.fn(),
    signInWithEmailPassword: jest.fn(),
    signUpWithEmailPassword: jest.fn(),
    checkEmailStatus: jest.fn(),
    session: null,
  }),
}));

jest.mock('../../components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        surface: '#FFFFFF',
        brand: { '500': '#007AFF' },
        textPrimary: '#000000',
        textSecondary: '#666666',
        border: '#E5E5E7',
        danger: { '500': '#FF3B30' },
        accent: { '500': '#34C759' },
        gray: { '100': '#F5F5F5', '200': '#E5E5E7', '800': '#333333' },
      },
    },
    colorScheme: 'light',
  }),
}));

const mockProps = {
  visible: true,
  onClose: jest.fn(),
};

describe('EmailOTPModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly when visible', () => {
    const { getByTestId, getByText } = render(<EmailOTPModal {...mockProps} />);
    
    expect(getByText('Sign in or Sign up')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('send-magic-link-button')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(<EmailOTPModal {...mockProps} visible={false} />);
    
    expect(queryByText('Sign in or Sign up')).toBeNull();
  });

  it('should validate email format', () => {
    const { getByTestId } = render(<EmailOTPModal {...mockProps} />);
    const emailInput = getByTestId('email-input');
    const sendButton = getByTestId('send-magic-link-button');

    // Invalid email - button should be disabled
    fireEvent.changeText(emailInput, 'invalid-email');
    expect(sendButton).toHaveProperty('props.accessibilityState.disabled', true);

    // Valid email - button should be enabled
    fireEvent.changeText(emailInput, 'test@example.com');
    expect(sendButton).toHaveProperty('props.accessibilityState.disabled', false);
  });

  it('should close modal when close button is pressed', () => {
    const { getByTestId } = render(<EmailOTPModal {...mockProps} />);
    
    fireEvent.press(getByTestId('close-button'));
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });
});
