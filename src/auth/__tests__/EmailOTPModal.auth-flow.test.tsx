import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { EmailOTPModal } from '../EmailOTPModal';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../components/ThemeProvider';

// Mock dependencies
jest.mock('../../providers/AuthProvider');
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
    },
  },
}));
jest.mock('../../components/ThemeProvider');
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children,
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('EmailOTPModal Authentication Flow', () => {
  const mockOnClose = jest.fn();
  const mockSignInWithEmailPassword = jest.fn();
  const mockSignUpWithEmailPassword = jest.fn();
  const mockSignInWithEmail = jest.fn();
  const mockCheckEmailStatus = jest.fn();
  
  const mockAuthStateSubscription = {
    unsubscribe: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      signInWithEmailPassword: mockSignInWithEmailPassword,
      signUpWithEmailPassword: mockSignUpWithEmailPassword,
      signInWithEmail: mockSignInWithEmail,
      checkEmailStatus: mockCheckEmailStatus,
      session: null,
    });

    // Mock useTheme
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        colors: {
          surface: '#ffffff',
          textPrimary: '#000000',
          textSecondary: '#666666',
          brand: { '500': '#007AFF' },
          accent: { '500': '#5856D6' },
          danger: { '500': '#FF3B30' },
          gray: { '200': '#E5E5EA', '800': '#1C1C1E' },
          border: '#C6C6C8',
        },
      },
      colorScheme: 'light',
    });

    // Mock supabase auth state change listener
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: mockAuthStateSubscription },
    });
  });

  describe('Failed Authentication Handling', () => {
    it('should keep modal open when sign in fails with wrong password', async () => {
      const { getByTestId } = render(
        <EmailOTPModal visible={true} onClose={mockOnClose} />
      );

      // Mock failed sign in
      mockSignInWithEmailPassword.mockRejectedValueOnce(
        new Error('Invalid login credentials')
      );

      // Enter credentials
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      
      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'wrongpassword');
      });

      // Attempt sign in
      const signInButton = getByTestId('signin-button');
      await act(async () => {
        fireEvent.press(signInButton);
      });

      // Wait for error handling
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sign In Failed',
          'Invalid email or password. Please check your credentials and try again.'
        );
      });

      // Modal should NOT be closed
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should ignore SIGNED_IN events during blackout period after failure', async () => {
      const { getByTestId } = render(
        <EmailOTPModal visible={true} onClose={mockOnClose} />
      );

      // Mock failed sign in
      mockSignInWithEmailPassword.mockRejectedValueOnce(
        new Error('Invalid login credentials')
      );

      // Capture the auth state change callback
      let authStateCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: mockAuthStateSubscription } };
      });

      // Re-render to capture the callback
      const { rerender } = render(
        <EmailOTPModal visible={true} onClose={mockOnClose} />
      );

      // Enter credentials and attempt sign in
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      
      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'wrongpassword');
      });

      const signInButton = getByTestId('signin-button');
      await act(async () => {
        fireEvent.press(signInButton);
      });

      // Wait for error
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Simulate a SIGNED_IN event immediately after failure (within blackout period)
      await act(async () => {
        authStateCallback('SIGNED_IN', { 
          access_token: 'token',
          user: { id: '123', email: 'test@example.com' }
        });
      });

      // Modal should NOT close due to blackout period
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close modal on SIGNED_IN event when not actively authenticating', async () => {
      // Capture the auth state change callback
      let authStateCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: mockAuthStateSubscription } };
      });

      const { getByTestId } = render(
        <EmailOTPModal visible={true} onClose={mockOnClose} />
      );

      // Simulate a random SIGNED_IN event without any authentication attempt
      await act(async () => {
        authStateCallback('SIGNED_IN', { 
          access_token: 'token',
          user: { id: '123', email: 'random@example.com' }
        });
      });

      // Modal should NOT close
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close modal only on legitimate SIGNED_IN after successful auth', async () => {
      // Capture the auth state change callback
      let authStateCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: mockAuthStateSubscription } };
      });

      const { getByTestId } = render(
        <EmailOTPModal visible={true} onClose={mockOnClose} />
      );

      // Mock successful sign in
      mockSignInWithEmailPassword.mockResolvedValueOnce({});

      // Enter credentials
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      
      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'correctpassword');
      });

      // Attempt sign in
      const signInButton = getByTestId('signin-button');
      await act(async () => {
        fireEvent.press(signInButton);
      });

      // Simulate SIGNED_IN event after successful auth
      await act(async () => {
        authStateCallback('SIGNED_IN', { 
          access_token: 'token',
          user: { id: '123', email: 'test@example.com' }
        });
      });

      // Modal SHOULD close for legitimate sign in
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});