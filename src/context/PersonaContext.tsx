import React, { createContext, useContext, useState, ReactNode, useMemo, useRef } from 'react';

export interface Persona {
  id: string;
  display_name: string;
  icon: string;
  system_prompt: string;
  default_model: string;
  requires_premium: boolean;
  tool_ids: string[];
  created_at: string;
}

interface PersonaContextType {
  currentPersona: Persona | null;
  setCurrentPersona: (persona: Persona | null) => void;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export const PersonaProvider = ({ children }: { children: ReactNode }) => {
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`🎭 PersonaProvider render #${renderCount.current}`, {
    currentPersona: currentPersona?.display_name || 'null'
  });
  
  console.log('🔥🔥🔥 PERSONA PROVIDER IS RENDERING 🔥🔥🔥');

  const value = useMemo(() => {
    console.log('🎭 PersonaProvider: creating new context value', {
      personaId: currentPersona?.id,
      personaName: currentPersona?.display_name
    });
    
    return {
      currentPersona,
      setCurrentPersona,
    };
  }, [currentPersona]);

  return (
    <PersonaContext.Provider value={value}>
      {children}
    </PersonaContext.Provider>
  );
};

export const usePersona = () => {
  const context = useContext(PersonaContext);
  if (context === undefined) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
};