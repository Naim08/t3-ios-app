-- Add tool tracking to messages table
ALTER TABLE public.messages
ADD COLUMN tool_calls JSONB DEFAULT NULL;

-- Example structure:
-- {
--   "tripplanner": {
--     "called_at": "2025-01-07T10:30:00Z",
--     "success": true,
--     "data": { ... actual tool response data ... }
--   },
--   "weather": {
--     "called_at": "2025-01-07T10:31:00Z",
--     "success": true,
--     "data": { ... weather data ... }
--   }
-- }

-- Add index for efficient querying of messages with tool calls
CREATE INDEX idx_messages_tool_calls ON public.messages USING GIN (tool_calls);

-- Add comment explaining the column
COMMENT ON COLUMN public.messages.tool_calls IS 'JSON object tracking tool calls made during this message. Keys are tool names, values contain timestamp, success status, and response data.';

-- Backfill existing tripplanner messages (optional - only if you want to migrate old data)
-- This looks for messages with trip plan patterns and marks them as having used tripplanner
UPDATE public.messages
SET tool_calls = jsonb_build_object(
  'tripplanner', jsonb_build_object(
    'called_at', created_at,
    'success', true,
    'data', null -- We don't have the original data for old messages
  )
)
WHERE role = 'assistant' 
  AND tool_calls IS NULL
  AND (
    content LIKE '%**Trip Plan:**%' 
    OR content LIKE '%destinations":[%'
    OR content LIKE '%Day 1 -%'
    OR content LIKE '%daily_itinerary%'
  );