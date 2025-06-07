import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface UsePremiumReturn {
  loading: boolean;
  error: string | null;
  grantPremium: () => Promise<void>;
  cancelPremium: () => Promise<void>;
}

/**
 * Hook for managing premium subscription
 */
export const usePremium = (): UsePremiumReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const grantPremium = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: funcError } = await supabase.functions.invoke('manage_premium', {
        body: { action: 'grant' }
      });
      
      if (funcError) {
        throw funcError;
      }

    } catch (err) {
      console.error('Error granting premium subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to grant premium subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelPremium = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: funcError } = await supabase.functions.invoke('manage_premium', {
        body: { action: 'cancel' }
      });
      
      if (funcError) {
        throw funcError;
      }

      console.log('Premium subscription canceled:', data);
    } catch (err) {
      console.error('Error canceling premium subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel premium subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    grantPremium,
    cancelPremium,
  };
};
