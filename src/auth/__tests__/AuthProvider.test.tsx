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

  it('should render without crashing', () => {
    const mockSubscription = { unsubscribe: jest.fn() };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: mockSubscription },
    });

    const { getByTestId } = renderWithAuthProvider(<TestComponent />);
    expect(getByTestId('user-status')).toBeTruthy();
  });
});