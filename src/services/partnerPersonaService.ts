import { supabase } from '../lib/supabase';
import { PartnerPersonaCustomization } from '../types/partnerPersona';
import { fetch } from 'expo/fetch';

export interface PartnerPersonaData {
  id: string;
  user_id: string;
  persona_id: string;
  relationship_type: string;
  intimacy_level: string;
  communication_style: string;
  personality_traits: { traitId: string; intensity: number }[];
  communication_preferences: PartnerPersonaCustomization['communicationPreferences'];
  memory_preferences: PartnerPersonaCustomization['memoryPreferences'];
  relationship_preferences: PartnerPersonaCustomization['relationshipPreferences'];
  privacy_settings: PartnerPersonaCustomization['privacySettings'];
  appearance_description?: string;
  voice_style?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMemory {
  id: string;
  persona_partner_id: string;
  memory_type: 'personal_detail' | 'relationship_milestone' | 'shared_experience' | 'preference' | 'emotional_moment';
  content: string;
  context?: string;
  importance_level: 1 | 2 | 3 | 4 | 5; // 1=low, 5=critical
  tags: string[];
  extracted_at: string;
  conversation_id?: string;
  message_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryExtractionResult {
  memories: {
    type: ConversationMemory['memory_type'];
    content: string;
    context?: string;
    importance: ConversationMemory['importance_level'];
    tags: string[];
  }[];
  summary: string;
}

export class PartnerPersonaService {
  
  /**
   * Save partner persona customization to database
   */
  static async savePartnerPersona(
    personaId: string,
    customization: PartnerPersonaCustomization
  ): Promise<{ success: boolean; partnerPersonaId?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Prepare data for database
      const partnerData = {
        user_id: user.id,
        persona_id: personaId,
        relationship_type: customization.relationshipType,
        intimacy_level: customization.intimacyLevel,
        communication_style: customization.communicationStyle,
        personality_traits: JSON.stringify(customization.personalityTraits),
        communication_preferences: JSON.stringify(customization.communicationPreferences),
        memory_preferences: JSON.stringify(customization.memoryPreferences),
        relationship_preferences: JSON.stringify(customization.relationshipPreferences),
        privacy_settings: JSON.stringify(customization.privacySettings),
        appearance_description: customization.appearance?.description,
        voice_style: customization.appearance?.voiceStyle,
      };

      const { data, error } = await supabase
        .from('persona_partners')
        .insert(partnerData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error saving partner persona:', error);
        return { success: false, error: error.message };
      }

      // Update the main persona to link to partner data
      await supabase
        .from('personas')
        .update({ 
          is_partner_persona: true,
          partner_persona_id: data.id 
        })
        .eq('id', personaId);

      console.log('✅ Partner persona saved successfully:', data.id);
      return { success: true, partnerPersonaId: data.id };

    } catch (error) {
      console.error('❌ Unexpected error saving partner persona:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get partner persona data by persona ID
   */
  static async getPartnerPersona(personaId: string): Promise<PartnerPersonaData | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data, error } = await supabase
        .from('persona_partners')
        .select('*')
        .eq('persona_id', personaId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.log('📄 No partner persona data found for:', personaId);
        return null;
      }

      return {
        ...data,
        personality_traits: JSON.parse(data.personality_traits || '[]'),
        communication_preferences: JSON.parse(data.communication_preferences || '{}'),
        memory_preferences: JSON.parse(data.memory_preferences || '{}'),
        relationship_preferences: JSON.parse(data.relationship_preferences || '{}'),
        privacy_settings: JSON.parse(data.privacy_settings || '{}'),
      };

    } catch (error) {
      console.error('❌ Error fetching partner persona:', error);
      return null;
    }
  }

  /**
   * Extract memories from conversation using AI
   */
  static async extractMemoriesFromConversation(
    conversationId: string,
    messages: { role: string; content: string; id: string }[],
    partnerPersonaId: string
  ): Promise<MemoryExtractionResult | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Prepare conversation context for AI analysis
      const conversationText = messages
        .filter(msg => msg.content.trim().length > 0)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // AI prompt for memory extraction
      const extractionPrompt = `Analyze this conversation between a user and their AI romantic partner. Extract important memories that should be stored for relationship continuity.

Conversation:
${conversationText}

Extract memories in these categories:
1. PERSONAL_DETAIL: Facts about the user (job, family, interests, goals, fears, etc.)
2. RELATIONSHIP_MILESTONE: Significant moments in their relationship (first conversation, special exchanges, etc.)
3. SHARED_EXPERIENCE: Activities they've discussed doing together or experiences they've shared
4. PREFERENCE: User's likes, dislikes, or preferences (food, activities, communication style, etc.)
5. EMOTIONAL_MOMENT: Significant emotional exchanges or vulnerable moments

For each memory, provide:
- type: One of the above categories (lowercase with underscores)
- content: Clear, specific memory content (what should be remembered)
- context: Brief context about when/how this came up
- importance: Number 1-5 (1=minor detail, 5=relationship-defining moment)
- tags: Relevant keywords for searching/grouping

Return JSON format:
{
  "memories": [
    {
      "type": "personal_detail",
      "content": "User works as a software engineer at a startup",
      "context": "Mentioned during career discussion",
      "importance": 3,
      "tags": ["career", "job", "tech"]
    }
  ],
  "summary": "Brief overview of what was discussed and relationship dynamics"
}

Only extract meaningful, specific information that would help maintain relationship continuity. Avoid generic statements.`;

      // Call AI gateway for memory extraction
      const gatewayUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gateway`;
      
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a relationship memory extraction specialist. Analyze conversations to identify important memories for relationship continuity.' },
            { role: 'user', content: extractionPrompt }
          ],
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Gateway error: ${response.status}`);
      }

      const aiResponse = await response.text();
      
      // Parse the AI response (it comes as streaming format, get the last complete response)
      const lines = aiResponse.trim().split('\n');
      let completeResponse = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              completeResponse += data.token;
            }
                     } catch {
             // Skip invalid JSON lines
           }
        }
      }

      if (!completeResponse.trim()) {
        console.log('📝 MEMORY: No meaningful memories extracted from conversation');
        return null;
      }

      // Try to parse the AI response as JSON
      let extractionResult: MemoryExtractionResult;
      try {
        // Clean up the response and extract JSON
        const jsonMatch = completeResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in AI response');
        }
        
        extractionResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('❌ Failed to parse AI memory extraction response:', parseError);
        console.log('📝 Raw AI response:', completeResponse);
        return null;
      }

      // Validate the extraction result
      if (!extractionResult.memories || !Array.isArray(extractionResult.memories)) {
        console.log('📝 MEMORY: No valid memories in extraction result');
        return null;
      }

      // Filter out invalid memories
      extractionResult.memories = extractionResult.memories.filter(memory => 
        memory.content && 
        memory.type && 
        memory.importance >= 1 && 
        memory.importance <= 5
      );

      if (extractionResult.memories.length === 0) {
        console.log('📝 MEMORY: No valid memories after filtering');
        return null;
      }

      console.log(`🧠 MEMORY: Extracted ${extractionResult.memories.length} memories from conversation for partner ${partnerPersonaId}`);
      return extractionResult;

    } catch (error) {
      console.error('❌ Error extracting memories:', error);
      return null;
    }
  }

  /**
   * Store extracted memories in database
   */
  static async storeMemories(
    partnerPersonaId: string,
    memories: MemoryExtractionResult['memories'],
    conversationId: string,
    messageId?: string
  ): Promise<{ success: boolean; storedCount: number }> {
    try {
      const memoryData = memories.map(memory => ({
        persona_partner_id: partnerPersonaId,
        memory_type: memory.type,
        content: memory.content,
        context: memory.context,
        importance_level: memory.importance,
        tags: memory.tags,
        conversation_id: conversationId,
        message_id: messageId,
      }));

      const { data, error } = await supabase
        .from('conversation_memory')
        .insert(memoryData)
        .select('id');

      if (error) {
        console.error('❌ Error storing memories:', error);
        return { success: false, storedCount: 0 };
      }

      const storedCount = data?.length || 0;
      console.log(`✅ MEMORY: Stored ${storedCount} memories in database`);
      return { success: true, storedCount };

    } catch (error) {
      console.error('❌ Unexpected error storing memories:', error);
      return { success: false, storedCount: 0 };
    }
  }

  /**
   * Get relevant memories for conversation context
   */
  static async getRelevantMemories(
    partnerPersonaId: string,
    currentMessage: string,
    limit: number = 10
  ): Promise<ConversationMemory[]> {
    try {
      // Get all memories for this partner persona, ordered by importance and recency
      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('persona_partner_id', partnerPersonaId)
        .order('importance_level', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more than needed for filtering

      if (error || !data) {
        console.log('📄 No memories found for partner persona:', partnerPersonaId);
        return [];
      }

      // Simple keyword-based relevance scoring
      const scoredMemories = data.map(memory => {
        const messageWords = currentMessage.toLowerCase().split(/\s+/);
        const memoryText = (memory.content + ' ' + (memory.context || '') + ' ' + memory.tags.join(' ')).toLowerCase();
        
        let relevanceScore = memory.importance_level; // Base score from importance
        
        // Boost score based on keyword matches
        let keywordMatches = 0;
        for (const word of messageWords) {
          if (word.length > 3 && memoryText.includes(word)) {
            keywordMatches++;
          }
        }
        
        relevanceScore += keywordMatches * 2; // Boost for keyword matches
        
        return {
          ...memory,
          relevanceScore
        };
      });

      // Sort by relevance score and take top results
      const relevantMemories = scoredMemories
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
        .map((scoredMemory) => {
          const { relevanceScore, ...memory } = scoredMemory;
          return memory as ConversationMemory;
        });

      if (relevantMemories.length > 0) {
        console.log(`🎯 MEMORY: Found ${relevantMemories.length} relevant memories for context`);
      }

      return relevantMemories;

    } catch (error) {
      console.error('❌ Error getting relevant memories:', error);
      return [];
    }
  }

  /**
   * Get all memories for a partner persona (for memory management UI)
   */
  static async getAllMemories(
    partnerPersonaId: string,
    memoryType?: ConversationMemory['memory_type']
  ): Promise<ConversationMemory[]> {
    try {
      let query = supabase
        .from('conversation_memory')
        .select('*')
        .eq('persona_partner_id', partnerPersonaId);

      if (memoryType) {
        query = query.eq('memory_type', memoryType);
      }

      const { data, error } = await query
        .order('importance_level', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching memories:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ Unexpected error fetching memories:', error);
      return [];
    }
  }

  /**
   * Delete a specific memory
   */
  static async deleteMemory(memoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('id', memoryId);

      if (error) {
        console.error('❌ Error deleting memory:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Memory deleted successfully:', memoryId);
      return { success: true };

    } catch (error) {
      console.error('❌ Unexpected error deleting memory:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update memory importance or content
   */
  static async updateMemory(
    memoryId: string,
    updates: { content?: string; importance_level?: number; tags?: string[] }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('conversation_memory')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', memoryId);

      if (error) {
        console.error('❌ Error updating memory:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Memory updated successfully:', memoryId);
      return { success: true };

    } catch (error) {
      console.error('❌ Unexpected error updating memory:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Create a relationship milestone
   */
  static async createMilestone(
    partnerPersonaId: string,
    title: string,
    description: string,
    type: 'anniversary' | 'first_time' | 'special_moment' | 'achievement' | 'memory',
    date?: Date
  ): Promise<{ success: boolean; milestoneId?: string; error?: string }> {
    try {
      const milestoneDate = date || new Date();
      
      const { data, error } = await supabase
        .from('conversation_memory')
        .insert({
          persona_partner_id: partnerPersonaId,
          memory_type: 'relationship_milestone',
          content: title,
          context: description,
          importance_level: 5, // Milestones are always high importance
          tags: ['milestone', type, 'timeline'],
          extracted_at: milestoneDate.toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating milestone:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Milestone created successfully:', data.id);
      return { success: true, milestoneId: data.id };

    } catch (error) {
      console.error('❌ Unexpected error creating milestone:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get relationship timeline for a partner persona
   */
  static async getRelationshipTimeline(
    partnerPersonaId: string
  ): Promise<{
    milestones: ConversationMemory[];
    relationshipStart: Date;
    totalDays: number;
    upcomingAnniversaries: { date: Date; title: string; daysUntil: number }[];
  }> {
    try {
      // Get all relationship milestones
      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('persona_partner_id', partnerPersonaId)
        .eq('memory_type', 'relationship_milestone')
        .order('extracted_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching timeline:', error);
        return {
          milestones: [],
          relationshipStart: new Date(),
          totalDays: 0,
          upcomingAnniversaries: [],
        };
      }

      const milestones = data || [];
      
      // Calculate relationship start date
      const relationshipStart = milestones.length > 0 
        ? new Date(milestones[0].created_at) 
        : new Date();

      // Calculate total relationship days
      const now = new Date();
      const totalDays = Math.ceil((now.getTime() - relationshipStart.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate upcoming anniversaries
      const upcomingAnniversaries = [];
      
      // Add monthly anniversaries (first 6 months)
      if (totalDays < 180) {
        for (let month = 1; month <= 6; month++) {
          const anniversaryDate = new Date(relationshipStart);
          anniversaryDate.setMonth(anniversaryDate.getMonth() + month);
          
          if (anniversaryDate > now) {
            const daysUntil = Math.ceil((anniversaryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            upcomingAnniversaries.push({
              date: anniversaryDate,
              title: `${month} Month Anniversary`,
              daysUntil,
            });
          }
        }
      }

      // Add yearly anniversaries
      let year = 1;
      while (year <= 10) {
        const anniversaryDate = new Date(relationshipStart);
        anniversaryDate.setFullYear(anniversaryDate.getFullYear() + year);
        
        if (anniversaryDate > now) {
          const daysUntil = Math.ceil((anniversaryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          upcomingAnniversaries.push({
            date: anniversaryDate,
            title: `${year} Year Anniversary`,
            daysUntil,
          });
          
          if (daysUntil > 365) break; // Don't look more than a year ahead
        }
        year++;
      }

      // Sort by days until and take top 3
      upcomingAnniversaries.sort((a, b) => a.daysUntil - b.daysUntil);
      const nextAnniversaries = upcomingAnniversaries.slice(0, 3);

      console.log(`📅 TIMELINE: Found ${milestones.length} milestones, ${totalDays} days together, ${nextAnniversaries.length} upcoming anniversaries`);

      return {
        milestones,
        relationshipStart,
        totalDays,
        upcomingAnniversaries: nextAnniversaries,
      };

    } catch (error) {
      console.error('❌ Error fetching relationship timeline:', error);
      return {
        milestones: [],
        relationshipStart: new Date(),
        totalDays: 0,
        upcomingAnniversaries: [],
      };
    }
  }

  /**
   * Auto-create milestone based on relationship duration
   */
  static async checkAndCreateAutoMilestones(
    partnerPersonaId: string
  ): Promise<void> {
    try {
      const timeline = await this.getRelationshipTimeline(partnerPersonaId);
      const { totalDays, relationshipStart } = timeline;

      // Check for milestone dates (1 week, 1 month, 3 months, 6 months, 1 year, etc.)
      const milestoneThresholds = [
        { days: 7, title: 'One Week Together', type: 'anniversary' as const },
        { days: 30, title: 'One Month Anniversary', type: 'anniversary' as const },
        { days: 90, title: 'Three Month Anniversary', type: 'anniversary' as const },
        { days: 180, title: 'Six Month Anniversary', type: 'anniversary' as const },
        { days: 365, title: 'One Year Anniversary', type: 'anniversary' as const },
        { days: 730, title: 'Two Year Anniversary', type: 'anniversary' as const },
      ];

      for (const threshold of milestoneThresholds) {
        if (totalDays >= threshold.days) {
          // Check if this milestone already exists
          const existingMilestone = timeline.milestones.find(m => 
            m.content === threshold.title
          );

          if (!existingMilestone) {
            const milestoneDate = new Date(relationshipStart);
            milestoneDate.setDate(milestoneDate.getDate() + threshold.days);

            await this.createMilestone(
              partnerPersonaId,
              threshold.title,
              `Celebrating ${threshold.title.toLowerCase()} of your relationship! 💕`,
              threshold.type,
              milestoneDate
            );

            console.log(`🎉 AUTO-MILESTONE: Created ${threshold.title} milestone`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error checking auto-milestones:', error);
    }
  }
} 