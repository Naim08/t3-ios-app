import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AuthProvider, useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, signIn, signOut } = useAuth();
  
  return (
    <>
      <button testID="sign-in" onPress={signIn}>
        Sign In
      </button>
      <button testID="sign-out" onPress={signOut}>
        Sign Out
      </button>
      <div testID="user-status">
        {loading ? 'loading' : user ? 'authenticated' : 'unauthenticated'}
      </div>
    </>
  );
};

const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe('AuthProvider', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle authentication flow: unauth → auth → sign-out', async () => {
    // Mock initial unauthenticated state
    const mockSubscription = { unsubscribe: jest.fn() };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: mockSubscription },
    });

    const { getByTestId } = renderWithAuthProvider(<TestComponent />);

    // Initial state: unauthenticated
    await waitFor(() => {
      expect(getByTestId('user-status')).toHaveTextContent('unauthenticated');
    });

    // Mock successful sign in
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      error: null,
    });

    // Trigger sign in
    fireEvent.press(getByTestId('sign-in'));

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
      });
    });

    // Simulate auth state change to authenticated
    const authStateChangeCallback = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0];
    authStateChangeCallback('SIGNED_IN', { user: mockUser });

    await waitFor(() => {
      expect(getByTestId('user-status')).toHaveTextContent('authenticated');
    });

    // Mock successful sign out
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    });

    // Trigger sign out
    fireEvent.press(getByTestId('sign-out'));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    // Simulate auth state change to unauthenticated
    authStateChangeCallback('SIGNED_OUT', null);

    await waitFor(() => {
      expect(getByTestId('user-status')).toHaveTextContent('unauthenticated');
    });
  });

  it('should handle cancelled sign-in', async () => {
    const mockSubscription = { unsubscribe: jest.fn() };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: mockSubscription },
    });

    // Mock cancelled sign in
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      error: { message: 'Sign-in was cancelled by the user' },
    });

    const { getByTestId } = renderWithAuthProvider(<TestComponent />);

    fireEvent.press(getByTestId('sign-in'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign-in cancelled',
        'Please try again to continue.'
      );
    });
  });

  it('should handle sign-in errors', async () => {
    const mockSubscription = { unsubscribe: jest.fn() };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: mockSubscription },
    });

    // Mock sign in error
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      error: { message: 'Network error' },
    });

    const { getByTestId } = renderWithAuthProvider(<TestComponent />);

    fireEvent.press(getByTestId('sign-in'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
    });
  });

  it('should restore session on app launch', async () => {
    const mockSubscription = { unsubscribe: jest.fn() };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: mockUser } },
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: mockSubscription },
    });

    const { getByTestId } = renderWithAuthProvider(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('user-status')).toHaveTextContent('authenticated');
    });
  });
});