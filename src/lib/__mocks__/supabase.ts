// Mock for Supabase client
export const supabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    }),
    signInWithOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    setSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
  },
  functions: {
    invoke: jest.fn().mockImplementation((functionName: string, options?: any) => {
      // Default mock implementation for credits functions
      switch (functionName) {
        case 'get_credits':
          return Promise.resolve({ data: { remaining: 5000 }, error: null });
        case 'spend_tokens':
          const amount = options?.body?.amount || 0;
          if (amount > 5000) {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'insufficient_credits' } 
            });
          }
          return Promise.resolve({ data: { remaining: 5000 - amount }, error: null });
        case 'add_tokens':
          const addAmount = options?.body?.amount || 0;
          return Promise.resolve({ data: { remaining: 5000 + addAmount }, error: null });
        default:
          return Promise.resolve({ data: null, error: { message: 'Function not found' } });
      }
    }),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};
