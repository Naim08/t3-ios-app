import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export interface UseCreditsReturn {
  remaining: number;
  monthlyRemaining: number;
  totalRemaining: number;
  isPremiumSubscriber: boolean;
  monthlyResetDate: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface SpendTokensReturn {
  remaining: number;
  monthlyRemaining?: number;
  monthlySpent?: number;
  purchasedSpent?: number;
}

/**
 * Hook for managing user credits
 */
export const useCredits = (): UseCreditsReturn => {
  const [remaining, setRemaining] = useState<number>(0);
  const [monthlyRemaining, setMonthlyRemaining] = useState<number>(0);
  const [totalRemaining, setTotalRemaining] = useState<number>(0);
  const [isPremiumSubscriber, setIsPremiumSubscriber] = useState<boolean>(false);
  const [monthlyResetDate, setMonthlyResetDate] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  console.log('💰 useCredits hook called');

  const fetchCredits = useCallback(async () => {
    console.log('💰 fetchCredits called', { user: user?.id, authLoading });
    
    if (!user) {
      // No user authenticated, reset state
      setRemaining(0);
      setMonthlyRemaining(0);
      setTotalRemaining(0);
      setIsPremiumSubscriber(false);
      setMonthlyResetDate(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('💰 Making credits API call...');
      const { data, error: funcError } = await supabase.functions.invoke('get_credits');
      
      if (funcError) {
        throw funcError;
      }

      console.log('💰 RAW API RESPONSE:', JSON.stringify(data, null, 2));

      setRemaining(data?.remaining || 0);
      setMonthlyRemaining(data?.monthly_remaining || 0);
      setTotalRemaining(data?.total_remaining || 0);
      setIsPremiumSubscriber(data?.is_premium_subscriber || false);
      setMonthlyResetDate(data?.monthly_reset_date || null);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credits');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    // Only fetch credits when auth loading is complete
    if (!authLoading) {
      fetchCredits();
    }
  }, [fetchCredits, authLoading]);

  // Reset credits when user logs out
  useEffect(() => {
    if (!user) {
      setRemaining(0);
      setMonthlyRemaining(0);
      setTotalRemaining(0);
      setIsPremiumSubscriber(false);
      setMonthlyResetDate(null);
      setError(null);
      setLoading(false);
    }
  }, [user]);

  return {
    remaining,
    monthlyRemaining,
    totalRemaining,
    isPremiumSubscriber,
    monthlyResetDate,
    loading,
    error,
    refetch: fetchCredits,
  };
};

/**
 * Function to spend tokens
 */
export const spendTokens = async (amount: number): Promise<SpendTokensReturn> => {
  try {
    const { data, error } = await supabase.functions.invoke('spend_tokens', {
      body: { amount }
    });

    if (error) {
      if (error.message?.includes('insufficient_credits')) {
        throw new Error('Insufficient credits');
      }
      throw error;
    }

    return { 
      remaining: data?.remaining || 0,
      monthlyRemaining: data?.monthly_remaining,
      monthlySpent: data?.monthly_spent,
      purchasedSpent: data?.purchased_spent,
    };
  } catch (err) {
    console.error('Error spending tokens:', err);
    throw err;
  }
};

/**
 * Function to add tokens (typically used internally)
 */
export const addTokens = async (amount: number): Promise<SpendTokensReturn> => {
  try {
    const { data, error } = await supabase.functions.invoke('add_tokens', {
      body: { amount }
    });

    if (error) {
      throw error;
    }

    return { remaining: data?.remaining || 0 };
  } catch (err) {
    console.error('Error adding tokens:', err);
    throw err;
  }
};
