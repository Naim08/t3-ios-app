-- Create table for Apple S2S notification events
CREATE TABLE IF NOT EXISTS iap_events (
    event_id TEXT PRIMARY KEY, -- Apple's unique notification identifier
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- DID_RENEW, CANCEL, EXPIRED, REFUND, etc.
    transaction_id TEXT NOT NULL, -- Apple transaction ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb -- Store additional Apple payload data
);

-- Create index for efficient lookups
CREATE INDEX idx_iap_events_user_id ON iap_events(user_id);
CREATE INDEX idx_iap_events_created_at ON iap_events(created_at);
CREATE INDEX idx_iap_events_type ON iap_events(event_type);

-- Add RLS policies
ALTER TABLE iap_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update events
CREATE POLICY "Service role can manage iap_events" ON iap_events
    FOR ALL USING (auth.role() = 'service_role');

-- Users can read their own events (for debugging)
CREATE POLICY "Users can view own iap_events" ON iap_events
    FOR SELECT USING (auth.uid() = user_id);