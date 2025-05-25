import React, { createContext, useContext, useState, useMemo } from 'react';

export interface EntitlementsContextType {
  isSubscriber: boolean;
  hasCustomKey: boolean;
  remainingTokens: number;
  setSubscriber: (value: boolean) => void;
  setCustomKey: (value: boolean) => void;
  setRemainingTokens: (value: number) => void;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export const EntitlementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSubscriber, setSubscriber] = useState(false);
  const [hasCustomKey, setCustomKey] = useState(false);
  const [remainingTokens, setRemainingTokens] = useState(25000); // Mock: 25K tokens remaining

  const contextValue = useMemo(
    () => ({
      isSubscriber,
      hasCustomKey,
      remainingTokens,
      setSubscriber,
      setCustomKey,
      setRemainingTokens,
    }),
    [isSubscriber, hasCustomKey, remainingTokens]
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
