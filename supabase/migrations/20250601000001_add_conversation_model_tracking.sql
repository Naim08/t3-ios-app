-- Add current_model column to conversations table for model persistence
-- This allows each conversation to remember the last model used

ALTER TABLE conversations 
ADD COLUMN current_model TEXT DEFAULT 'gpt-3.5';

-- Add an index for performance when querying by current_model
CREATE INDEX idx_conversations_current_model ON conversations(current_model);

-- Create function to update conversation's current model
CREATE OR REPLACE FUNCTION update_conversation_model(
  conversation_uuid UUID,
  new_model TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the conversation's current model
  UPDATE conversations 
  SET 
    current_model = new_model,
    updated_at = NOW()
  WHERE id = conversation_uuid 
    AND user_id = auth.uid(); -- Ensure user owns the conversation
  
  -- Return whether the update was successful
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_conversation_model TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN conversations.current_model IS 'The AI model currently selected for this conversation';
COMMENT ON FUNCTION update_conversation_model IS 'Updates the current model for a conversation, ensuring user ownership';
