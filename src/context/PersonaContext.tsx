import React, { createContext, useContext, useState, ReactNode, useMemo, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Persona {
  id: string;
  display_name: string;
  icon: string;
  system_prompt: string;
  default_model: string;
  requires_premium: boolean;
  tool_ids: string[];
  created_at: string;
  // Enhanced fields
  category_id?: string;
  created_by_user_id?: string;
  is_template?: boolean;
  tags?: string[];
  usage_count?: number;
  description?: string;
  is_featured?: boolean;
}

export interface PersonaCategory {
  id: string;
  name: string;
  description?: string;
  icon: string;
  sort_order: number;
}

export interface PersonaUsageStats {
  user_id: string;
  persona_id: string;
  conversation_count: number;
  last_used_at: string;
}

export interface UserPersonaFavorite {
  user_id: string;
  persona_id: string;
  created_at: string;
}

interface PersonaContextType {
  currentPersona: Persona | null;
  setCurrentPersona: (persona: Persona | null) => void;
  favorites: Persona[];
  recentPersonas: Persona[];
  categories: PersonaCategory[];
  toggleFavorite: (personaId: string) => Promise<void>;
  trackUsage: (personaId: string) => Promise<void>;
  refreshPersonaData: () => Promise<void>;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export const PersonaProvider = ({ children }: { children: ReactNode }) => {
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [favorites, setFavorites] = useState<Persona[]>([]);
  const [recentPersonas, setRecentPersonas] = useState<Persona[]>([]);
  const [categories, setCategories] = useState<PersonaCategory[]>([]);
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`🎭 PersonaProvider render #${renderCount.current}`, {
    currentPersona: currentPersona?.display_name || 'null'
  });
  
  console.log('🔥🔥🔥 PERSONA PROVIDER IS RENDERING 🔥🔥🔥');

  // Load user's favorite personas
  const loadFavorites = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase.rpc('get_user_favorite_personas', {
        user_uuid: user.user.id
      });

      if (error) {
        console.error('Error loading favorites:', error);
        return;
      }

      setFavorites(data || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  // Load user's recent personas
  const loadRecentPersonas = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase.rpc('get_user_recent_personas', {
        user_uuid: user.user.id,
        limit_count: 5
      });

      if (error) {
        console.error('Error loading recent personas:', error);
        return;
      }

      setRecentPersonas(data || []);
    } catch (error) {
      console.error('Error loading recent personas:', error);
    }
  }, []);

  // Load persona categories
  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('persona_categories')
        .select('*')
        .order('sort_order');

      if (error) {
        console.error('Error loading categories:', error);
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (personaId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const isFavorite = favorites.some(f => f.id === personaId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_persona_favorites')
          .delete()
          .eq('user_id', user.user.id)
          .eq('persona_id', personaId);

        if (error) {
          console.error('Error removing favorite:', error);
          return;
        }

        setFavorites(prev => prev.filter(f => f.id !== personaId));
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_persona_favorites')
          .insert({
            user_id: user.user.id,
            persona_id: personaId
          });

        if (error) {
          console.error('Error adding favorite:', error);
          return;
        }

        // Reload favorites to get the full persona data
        loadFavorites();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [favorites, loadFavorites]);

  // Track persona usage
  const trackUsage = useCallback(async (personaId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase.rpc('track_persona_usage', {
        persona_id: personaId,
        user_id: user.user.id
      });

      if (error) {
        console.error('Error tracking usage:', error);
        return;
      }

      // Refresh recent personas
      loadRecentPersonas();
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }, [loadRecentPersonas]);

  // Refresh all persona data
  const refreshPersonaData = useCallback(async () => {
    await Promise.all([
      loadFavorites(),
      loadRecentPersonas(),
      loadCategories()
    ]);
  }, [loadFavorites, loadRecentPersonas, loadCategories]);

  // Load data on mount
  useEffect(() => {
    refreshPersonaData();
  }, [refreshPersonaData]);

  const value = useMemo(() => {
    console.log('🎭 PersonaProvider: creating new context value', {
      personaId: currentPersona?.id,
      personaName: currentPersona?.display_name,
      favoritesCount: favorites.length,
      recentCount: recentPersonas.length,
      categoriesCount: categories.length
    });
    
    return {
      currentPersona,
      setCurrentPersona,
      favorites,
      recentPersonas,
      categories,
      toggleFavorite,
      trackUsage,
      refreshPersonaData,
    };
  }, [currentPersona, favorites, recentPersonas, categories, toggleFavorite, trackUsage, refreshPersonaData]);

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