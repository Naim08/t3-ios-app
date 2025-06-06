import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useEntitlements } from './useEntitlements';
import { Tool } from '../context/PersonaContext';

interface UseAvailableToolsResult {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAvailableTools = (): UseAvailableToolsResult => {
  const { isSubscriber } = useEntitlements();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔧 Fetching available tools...');
      
      // Fetch all tools from database
      const { data: allTools, error: fetchError } = await supabase
        .from('tools')
        .select('*')
        .order('cost_tokens', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch tools: ${fetchError.message}`);
      }

      if (!allTools) {
        console.log('⚠️ No tools found in database');
        setTools([]);
        return;
      }

      console.log(`📊 Found ${allTools.length} tools in database`);

      // Filter tools based on user subscription
      const availableTools = allTools.filter(tool => {
        const hasAccess = !tool.requires_premium || isSubscriber;
        if (!hasAccess) {
          console.log(`🔒 Tool "${tool.name}" requires premium subscription`);
        }
        return hasAccess;
      });

      console.log(`✅ ${availableTools.length} tools available to user`);
      console.log('Available tools:', availableTools.map(t => `${t.name} (${t.cost_tokens} tokens)`));

      setTools(availableTools);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Error fetching tools:', errorMessage);
      setError(errorMessage);
      setTools([]);
    } finally {
      setLoading(false);
    }
  }, [isSubscriber]);

  // Fetch tools on mount and when subscription status changes
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return {
    tools,
    loading,
    error,
    refetch: fetchTools
  };
};