-- Add premium subscription columns to user_credits table
ALTER TABLE user_credits 
ADD COLUMN monthly_tokens_remaining INTEGER DEFAULT 0,
ADD COLUMN monthly_reset_date TIMESTAMP,
ADD COLUMN is_premium_subscriber BOOLEAN DEFAULT FALSE;

-- Function to grant monthly premium tokens
CREATE OR REPLACE FUNCTION grant_premium_monthly_tokens(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_monthly_balance INTEGER := 500000; -- 500K monthly tokens for premium
    next_reset_date TIMESTAMP;
BEGIN
    -- Calculate next reset date (first day of next month)
    next_reset_date := date_trunc('month', NOW() + interval '1 month');
    
    -- Update user's premium status and monthly tokens
    UPDATE user_credits 
    SET 
        is_premium_subscriber = TRUE,
        monthly_tokens_remaining = new_monthly_balance,
        monthly_reset_date = next_reset_date,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_credits (user_id, remaining, monthly_tokens_remaining, monthly_reset_date, is_premium_subscriber)
        VALUES (user_uuid, 150000, new_monthly_balance, next_reset_date, TRUE);
    END IF;
    
    RETURN json_build_object(
        'monthly_tokens_remaining', new_monthly_balance,
        'monthly_reset_date', next_reset_date
    );
END;
$$;

-- Function to reset monthly tokens for premium users
CREATE OR REPLACE FUNCTION reset_monthly_tokens()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reset_count INTEGER := 0;
    next_reset_date TIMESTAMP;
BEGIN
    -- Calculate next reset date
    next_reset_date := date_trunc('month', NOW() + interval '1 month');
    
    -- Reset monthly tokens for premium users whose reset date has passed
    UPDATE user_credits 
    SET 
        monthly_tokens_remaining = 500000,
        monthly_reset_date = next_reset_date,
        updated_at = NOW()
    WHERE is_premium_subscriber = TRUE 
    AND monthly_reset_date <= NOW();
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    RETURN json_build_object('reset_count', reset_count);
END;
$$;

-- Function to cancel premium subscription
CREATE OR REPLACE FUNCTION cancel_premium_subscription(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_credits 
    SET 
        is_premium_subscriber = FALSE,
        monthly_tokens_remaining = 0,
        monthly_reset_date = NULL,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RETURN json_build_object('success', TRUE);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION grant_premium_monthly_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_premium_subscription TO authenticated;
