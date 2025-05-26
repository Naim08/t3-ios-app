-- Create user_subscriptions table for Apple IAP tracking
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    original_transaction_id TEXT NOT NULL,
    latest_receipt TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    purchase_date_ms BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    product_id TEXT NOT NULL DEFAULT 'premium_pass_monthly',
    last_validated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Composite unique constraint for idempotency
    UNIQUE(original_transaction_id, purchase_date_ms)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_original_tx_id ON user_subscriptions(original_transaction_id);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_subscriptions 
        WHERE user_id = user_uuid 
        AND expires_at > NOW() 
        AND is_active = TRUE
    );
END;
$$;

-- Function to get user's latest subscription info
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sub_info RECORD;
BEGIN
    SELECT 
        original_transaction_id,
        expires_at,
        is_active,
        product_id
    INTO sub_info
    FROM user_subscriptions 
    WHERE user_id = user_uuid 
    ORDER BY expires_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'has_subscription', false,
            'is_active', false
        );
    END IF;
    
    RETURN json_build_object(
        'has_subscription', true,
        'is_active', sub_info.is_active AND sub_info.expires_at > NOW(),
        'expires_at', sub_info.expires_at,
        'product_id', sub_info.product_id,
        'original_transaction_id', sub_info.original_transaction_id
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION has_active_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_info TO authenticated;
