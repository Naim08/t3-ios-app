-- Update the spend_user_tokens function to prioritize monthly credits
CREATE OR REPLACE FUNCTION spend_user_tokens(user_uuid UUID, amount INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_monthly INTEGER := 0;
    current_purchased INTEGER := 0;
    monthly_spent INTEGER := 0;
    purchased_spent INTEGER := 0;
    new_monthly INTEGER;
    new_purchased INTEGER;
BEGIN
    -- Get current balances
    SELECT 
        COALESCE(monthly_tokens_remaining, 0),
        remaining
    INTO current_monthly, current_purchased
    FROM user_credits 
    WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'user_not_found';
    END IF;
    
    -- Check if user has enough total tokens
    IF (current_monthly + current_purchased) < amount THEN
        RAISE EXCEPTION 'insufficient_credits';
    END IF;
    
    -- Spend monthly tokens first, then purchased tokens
    IF current_monthly >= amount THEN
        -- Can cover entirely with monthly tokens
        monthly_spent := amount;
        purchased_spent := 0;
    ELSE
        -- Use all monthly tokens, then purchased tokens
        monthly_spent := current_monthly;
        purchased_spent := amount - current_monthly;
    END IF;
    
    -- Calculate new balances
    new_monthly := current_monthly - monthly_spent;
    new_purchased := current_purchased - purchased_spent;
    
    -- Atomic update
    UPDATE user_credits 
    SET 
        monthly_tokens_remaining = new_monthly,
        remaining = new_purchased,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RETURN json_build_object(
        'remaining', new_purchased,
        'monthly_remaining', new_monthly,
        'monthly_spent', monthly_spent,
        'purchased_spent', purchased_spent
    );
END;
$$;

-- Update get_user_credits to include monthly tokens
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credits_balance INTEGER;
    monthly_balance INTEGER;
    is_premium BOOLEAN;
    reset_date TIMESTAMP;
BEGIN
    SELECT 
        remaining, 
        COALESCE(monthly_tokens_remaining, 0),
        COALESCE(is_premium_subscriber, FALSE),
        monthly_reset_date
    INTO credits_balance, monthly_balance, is_premium, reset_date
    FROM user_credits 
    WHERE user_id = user_uuid;
    
    -- If no record exists, return defaults
    IF NOT FOUND THEN
        credits_balance := 0;
        monthly_balance := 0;
        is_premium := FALSE;
        reset_date := NULL;
    END IF;
    
    RETURN json_build_object(
        'remaining', credits_balance,
        'monthly_remaining', monthly_balance,
        'total_remaining', credits_balance + monthly_balance,
        'is_premium_subscriber', is_premium,
        'monthly_reset_date', reset_date
    );
END;
$$;
