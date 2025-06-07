-- Add index for tool cost lookups to optimize performance

-- Create index on cost_tokens for efficient cost-based queries
CREATE INDEX IF NOT EXISTS idx_tools_cost_tokens ON public.tools(cost_tokens);

-- Create composite index for premium tools with costs
CREATE INDEX IF NOT EXISTS idx_tools_premium_cost ON public.tools(requires_premium, cost_tokens);

-- Create index for tool name lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_tools_name_lower ON public.tools(lower(name));

-- Add check constraint to ensure positive token costs
ALTER TABLE public.tools 
ADD CONSTRAINT check_positive_cost_tokens 
CHECK (cost_tokens >= 0);

-- Add comment for documentation
COMMENT ON COLUMN public.tools.cost_tokens IS 'Token cost for using this tool (100x multiplier applied for enhanced pricing model)';