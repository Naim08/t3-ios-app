-- Create tools table for function calling
CREATE TABLE IF NOT EXISTS public.tools (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text NOT NULL, -- Shown to model for function selection
    json_schema jsonb NOT NULL, -- OpenAI function calling schema
    endpoint text NOT NULL, -- Resolver function path or URL
    cost_tokens integer DEFAULT 0 CHECK (cost_tokens >= 0),
    requires_premium boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Everyone can read tools (to show available tools)
CREATE POLICY "Tools are viewable by everyone" ON public.tools
    FOR SELECT USING (true);

-- Only service role can modify tools
CREATE POLICY "Service role can manage tools" ON public.tools
    FOR ALL USING (auth.role() = 'service_role');

-- Create tool_call_log for deduplication
CREATE TABLE IF NOT EXISTS public.tool_call_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_id text NOT NULL REFERENCES public.tools(id),
    call_id text NOT NULL, -- OpenAI function call ID
    arguments jsonb,
    result jsonb,
    tokens_spent integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, call_id) -- Prevent duplicate executions
);

-- Add RLS policies for tool_call_log
ALTER TABLE public.tool_call_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tool calls
CREATE POLICY "Users can view own tool calls" ON public.tool_call_log
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all tool calls
CREATE POLICY "Service role can manage tool calls" ON public.tool_call_log
    FOR ALL USING (auth.role() = 'service_role');

-- Add tool_ids column to personas table
ALTER TABLE public.personas 
ADD COLUMN IF NOT EXISTS tool_ids text[] DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tools_requires_premium ON public.tools(requires_premium);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_user_id ON public.tool_call_log(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_created_at ON public.tool_call_log(created_at DESC);

-- Add updated_at trigger for tools table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON public.tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();