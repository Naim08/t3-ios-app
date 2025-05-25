import { useMemo } from 'react';
import { useEntitlementsContext } from '../context/EntitlementsProvider';

export interface UseEntitlementsReturn {
  isSubscriber: boolean;
  hasCustomKey: boolean;
  remainingTokens: number;
}

export const useEntitlements = (): UseEntitlementsReturn => {
  const { isSubscriber, hasCustomKey, remainingTokens } = useEntitlementsContext();

  return useMemo(
    () => ({
      isSubscriber,
      hasCustomKey,
      remainingTokens,
    }),
    [isSubscriber, hasCustomKey, remainingTokens]
  );
};
