-- Create tx_log table to track token spending transactions
-- This prevents duplicate spending through idempotency keys

CREATE TABLE IF NOT EXISTS public.tx_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_idempotency_key UNIQUE (user_id, idempotency_key)
);

-- Create indexes for common queries
CREATE INDEX idx_tx_log_user_id ON public.tx_log(user_id);
CREATE INDEX idx_tx_log_created_at ON public.tx_log(created_at);
CREATE INDEX idx_tx_log_status ON public.tx_log(status);
CREATE INDEX idx_tx_log_model ON public.tx_log(model);

-- Enable RLS
ALTER TABLE public.tx_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Users can only see their own transaction logs
CREATE POLICY "Users can view own tx_log entries" ON public.tx_log
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert/update (edge functions)
CREATE POLICY "Service role can manage tx_log" ON public.tx_log
    FOR ALL
    USING (auth.role() = 'service_role');

-- Add trigger to auto-update completed_at
CREATE OR REPLACE FUNCTION update_tx_log_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tx_log_completed_at_trigger
    BEFORE UPDATE ON public.tx_log
    FOR EACH ROW
    EXECUTE FUNCTION update_tx_log_completed_at();

-- Add comment for documentation
COMMENT ON TABLE public.tx_log IS 'Transaction log for token spending with idempotency support to prevent duplicate charges';