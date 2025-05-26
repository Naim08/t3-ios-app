import { useMemo } from 'react';
import { useEntitlementsContext } from '../context/EntitlementsProvider';

export interface UseEntitlementsReturn {
  isSubscriber: boolean;
  hasCustomKey: boolean;
  remainingTokens: number;
  creditsLoading: boolean;
  creditsError: string | null;
  refreshCredits: () => Promise<void>;
}

export const useEntitlements = (): UseEntitlementsReturn => {
  const { 
    isSubscriber, 
    hasCustomKey, 
    remainingTokens, 
    creditsLoading, 
    creditsError, 
    refreshCredits 
  } = useEntitlementsContext();

  return useMemo(
    () => ({
      isSubscriber,
      hasCustomKey,
      remainingTokens,
      creditsLoading,
      creditsError,
      refreshCredits,
    }),
    [isSubscriber, hasCustomKey, remainingTokens, creditsLoading, creditsError, refreshCredits]
  );
};
