-- Create user credits table
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    remaining INTEGER NOT NULL DEFAULT 0 CHECK (remaining >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/update their own credits
CREATE POLICY "Users can manage own credits" ON user_credits
    FOR ALL USING (auth.uid() = user_id);

-- Function to atomically spend tokens
CREATE OR REPLACE FUNCTION spend_user_tokens(user_uuid UUID, amount INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
    credits_record RECORD;
BEGIN
    -- Atomic update with balance check
    UPDATE user_credits 
    SET 
        remaining = remaining - amount,
        updated_at = NOW()
    WHERE user_id = user_uuid AND remaining >= amount
    RETURNING remaining INTO new_balance;
    
    -- Check if update succeeded
    IF NOT FOUND THEN
        -- Check if user has credits record
        SELECT remaining INTO credits_record FROM user_credits WHERE user_id = user_uuid;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'user_not_found';
        ELSE
            RAISE EXCEPTION 'insufficient_credits';
        END IF;
    END IF;
    
    RETURN json_build_object('remaining', new_balance);
END;
$$;

-- Function to add tokens (for StoreKit webhook later)
CREATE OR REPLACE FUNCTION add_user_tokens(user_uuid UUID, amount INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    -- Insert or update credits
    INSERT INTO user_credits (user_id, remaining)
    VALUES (user_uuid, amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        remaining = user_credits.remaining + amount,
        updated_at = NOW()
    RETURNING remaining INTO new_balance;
    
    RETURN json_build_object('remaining', new_balance);
END;
$$;

-- Function to get user credits
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credits_balance INTEGER;
BEGIN
    SELECT remaining INTO credits_balance 
    FROM user_credits 
    WHERE user_id = user_uuid;
    
    -- If no record exists, return 0
    IF NOT FOUND THEN
        credits_balance := 0;
    END IF;
    
    RETURN json_build_object('remaining', credits_balance);
END;
$$;

-- Trigger to automatically seed new users with 150K tokens
CREATE OR REPLACE FUNCTION seed_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_credits (user_id, remaining)
    VALUES (NEW.id, 150000)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_seed_user_credits ON auth.users;
CREATE TRIGGER trigger_seed_user_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION seed_user_credits();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION spend_user_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credits TO authenticated;
