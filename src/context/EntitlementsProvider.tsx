import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useCredits } from '../hooks/useCredits';

export interface EntitlementsContextType {
  isSubscriber: boolean;
  hasCustomKey: boolean;
  remainingTokens: number;
  creditsLoading: boolean;
  creditsError: string | null;
  setSubscriber: (value: boolean) => void;
  setCustomKey: (value: boolean) => void;
  refreshCredits: () => Promise<void>;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export const EntitlementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSubscriber, setSubscriber] = useState(false);
  const [hasCustomKey, setCustomKey] = useState(false);
  
  // Use real credits from the hook
  const { remaining, loading: creditsLoading, error: creditsError, refetch } = useCredits();

  const contextValue = useMemo(
    () => ({
      isSubscriber,
      hasCustomKey,
      remainingTokens: remaining,
      creditsLoading,
      creditsError,
      setSubscriber,
      setCustomKey,
      refreshCredits: refetch,
    }),
    [isSubscriber, hasCustomKey, remaining, creditsLoading, creditsError, refetch]
  );

  return (
    <EntitlementsContext.Provider value={contextValue}>
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlementsContext = () => {
  const context = useContext(EntitlementsContext);
  if (context === undefined) {
    throw new Error('useEntitlementsContext must be used within an EntitlementsProvider');
  }
  return context;
};
