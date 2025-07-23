-- Migration: Add Partner Personas System
-- This adds support for romantic companion personas with enhanced memory and relationship features
-- NOTE: This migration runs AFTER personas table is created in 20250610000001

-- 1. Extend personas table with partner-specific fields
ALTER TABLE personas ADD COLUMN IF NOT EXISTS is_partner_persona BOOLEAN DEFAULT FALSE;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS partner_persona_id TEXT REFERENCES personas(id); -- Fixed: TEXT to match existing schema
ALTER TABLE personas ADD COLUMN IF NOT EXISTS relationship_status TEXT CHECK (relationship_status IN ('single', 'dating', 'committed', 'married'));

-- 2. Create persona_partners table for detailed partner data
CREATE TABLE IF NOT EXISTS persona_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE, -- Fixed: TEXT to match existing schema
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Relationship Details
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('girlfriend', 'boyfriend', 'romantic_friend', 'life_partner')),
  intimacy_level TEXT DEFAULT 'casual' CHECK (intimacy_level IN ('casual', 'romantic', 'intimate', 'deep')),
  relationship_start_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Personality Traits (JSON for flexibility)
  personality_traits JSONB DEFAULT '{}',
  communication_style TEXT DEFAULT 'balanced' CHECK (communication_style IN ('playful', 'serious', 'balanced', 'flirty', 'caring')),
  
  -- Memory Preferences
  memory_preferences JSONB DEFAULT '{
    "remember_personal_details": true,
    "remember_conversations": true,
    "remember_milestones": true,
    "auto_extract_memories": true
  }',
  
  -- Privacy Settings
  privacy_settings JSONB DEFAULT '{
    "conversation_encryption": true,
    "data_retention_days": null,
    "allow_analytics": false,
    "share_with_ai_training": false
  }',
  
  -- Relationship Stats
  total_conversations INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  relationship_milestones JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(persona_id, user_id)
);

-- 3. Create conversation_memory table for relationship continuity
CREATE TABLE IF NOT EXISTS conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_partner_id UUID NOT NULL REFERENCES persona_partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Memory Details
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'personal_detail',     -- User's personal information
    'shared_experience',   -- Things done together
    'milestone',          -- Relationship milestones
    'preference',         -- User preferences
    'emotion',           -- Emotional moments
    'goal',              -- User's goals/dreams
    'story'              -- Important stories shared
  )),
  
  -- Memory Content
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  importance_level INTEGER DEFAULT 5 CHECK (importance_level BETWEEN 1 AND 10),
  
  -- Context
  extracted_from_message_id UUID, -- If extracted from a message
  tags TEXT[] DEFAULT '{}',
  
  -- Dates
  memory_date TIMESTAMPTZ DEFAULT NOW(), -- When this memory occurred
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create partner_conversation_privacy table
CREATE TABLE IF NOT EXISTS partner_conversation_privacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  persona_partner_id UUID NOT NULL REFERENCES persona_partners(id) ON DELETE CASCADE,
  
  -- Privacy Controls
  is_encrypted BOOLEAN DEFAULT TRUE,
  encryption_key_hash TEXT, -- For client-side encryption
  auto_delete_after_days INTEGER,
  exclude_from_analytics BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(conversation_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_persona_partners_user_id ON persona_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_partners_persona_id ON persona_partners(persona_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_persona_partner ON conversation_memory(persona_partner_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_type ON conversation_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_importance ON conversation_memory(importance_level DESC);
CREATE INDEX IF NOT EXISTS idx_partner_conversation_privacy_conversation ON partner_conversation_privacy(conversation_id);

-- 6. Create RLS (Row Level Security) policies
ALTER TABLE persona_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_conversation_privacy ENABLE ROW LEVEL SECURITY;

-- Persona Partners Policies
CREATE POLICY "Users can manage their own partner personas" ON persona_partners
  FOR ALL USING (auth.uid() = user_id);

-- Conversation Memory Policies  
CREATE POLICY "Users can manage their own memories" ON conversation_memory
  FOR ALL USING (auth.uid() = user_id);

-- Partner Conversation Privacy Policies
CREATE POLICY "Users can manage their own conversation privacy" ON partner_conversation_privacy
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM persona_partners pp
      WHERE pp.id = partner_conversation_privacy.persona_partner_id
      AND pp.user_id = auth.uid()
    )
  );

-- 7. Create functions for memory management
CREATE OR REPLACE FUNCTION extract_memory_from_message(
  p_message_id UUID,
  p_persona_partner_id UUID,
  p_memory_type TEXT,
  p_title TEXT,
  p_content TEXT,
  p_importance INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  memory_id UUID;
  partner_user_id UUID;
BEGIN
  -- Get user_id from persona_partner
  SELECT user_id INTO partner_user_id
  FROM persona_partners
  WHERE id = p_persona_partner_id;
  
  -- Insert memory
  INSERT INTO conversation_memory (
    persona_partner_id,
    user_id,
    memory_type,
    title,
    content,
    importance_level,
    extracted_from_message_id
  )
  VALUES (
    p_persona_partner_id,
    partner_user_id,
    p_memory_type,
    p_title,
    p_content,
    p_importance,
    p_message_id
  )
  RETURNING id INTO memory_id;
  
  RETURN memory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get relevant memories for conversation
CREATE OR REPLACE FUNCTION get_relevant_memories(
  p_persona_partner_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  title TEXT,
  content TEXT,
  importance_level INTEGER,
  memory_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.memory_type,
    cm.title,
    cm.content,
    cm.importance_level,
    cm.memory_date
  FROM conversation_memory cm
  WHERE cm.persona_partner_id = p_persona_partner_id
  ORDER BY cm.importance_level DESC, cm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_persona_partners_updated_at
  BEFORE UPDATE ON persona_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_memory_updated_at
  BEFORE UPDATE ON conversation_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Add some example relationship milestones
INSERT INTO conversation_memory (
  persona_partner_id,
  user_id,
  memory_type,
  title,
  content,
  importance_level
)
SELECT 
  pp.id,
  pp.user_id,
  'milestone',
  'First Conversation',
  'Our very first conversation together - the beginning of our relationship',
  10
FROM persona_partners pp
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_memory cm
  WHERE cm.persona_partner_id = pp.id
  AND cm.memory_type = 'milestone'
  AND cm.title = 'First Conversation'
);

COMMENT ON TABLE persona_partners IS 'Stores detailed information about partner personas including relationship dynamics and preferences';
COMMENT ON TABLE conversation_memory IS 'Stores memories and context for maintaining relationship continuity across conversations';
COMMENT ON TABLE partner_conversation_privacy IS 'Privacy controls and encryption settings for partner persona conversations'; 