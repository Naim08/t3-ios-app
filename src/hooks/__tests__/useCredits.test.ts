import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCredits, spendTokens } from '../useCredits';
import { supabase } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Mock useAuth hook
const mockUseAuth = {
  user: { id: 'test-user' } as User | null,
  loading: false,
  session: null,
  isOnline: true,
  signInWithApple: jest.fn(),
  signInWithEmail: jest.fn(),
  signInWithEmailPassword: jest.fn(),
  signUpWithEmailPassword: jest.fn(),
  checkEmailStatus: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../../providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth,
}));

// Get the mock function from the global mock
const mockInvoke = supabase.functions.invoke as jest.MockedFunction<typeof supabase.functions.invoke>;

describe('useCredits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth mock to default state
    mockUseAuth.user = { id: 'test-user' } as User;
    mockUseAuth.loading = false;
  });

  it('should fetch credits when user is authenticated', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { remaining: 1500 },
      error: null,
    });

    const { result } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.remaining).toBe(1500);
    expect(result.current.error).toBe(null);
    expect(mockInvoke).toHaveBeenCalledWith('get_credits');
  });

  it('should not fetch credits when user is not authenticated', async () => {
    mockUseAuth.user = null;

    const { result } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.remaining).toBe(0);
    expect(result.current.error).toBe(null);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should not fetch credits while auth is loading', async () => {
    mockUseAuth.loading = true;

    const { result } = renderHook(() => useCredits());

    // Should remain in initial state
    expect(result.current.loading).toBe(false);
    expect(result.current.remaining).toBe(0);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Network error'),
    });

    const { result } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.remaining).toBe(0);
    expect(result.current.error).toBe('Network error');
  });

  it('should refetch credits when refetch is called', async () => {
    mockInvoke
      .mockResolvedValueOnce({
        data: { remaining: 1500 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { remaining: 1200 },
        error: null,
      });

    const { result } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.remaining).toBe(1500);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.remaining).toBe(1200);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});

describe('spendTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should spend tokens successfully', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { remaining: 1200 },
      error: null,
    });

    const result = await spendTokens(300);

    expect(result.remaining).toBe(1200);
    expect(mockInvoke).toHaveBeenCalledWith('spend_tokens', {
      body: { amount: 300 }
    });
  });

  it('should throw error for insufficient credits', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'insufficient_credits' },
    });

    await expect(spendTokens(1000)).rejects.toThrow('Insufficient credits');
  });

  it('should throw error for other failures', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    await expect(spendTokens(100)).rejects.toThrow('Database error');
  });
});
