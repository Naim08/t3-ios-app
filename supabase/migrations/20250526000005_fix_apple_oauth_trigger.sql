-- Fix Apple OAuth database error by ensuring trigger exists and functions properly
-- This migration should be idempotent and safe to run multiple times

-- Ensure the seed_user_credits function exists with proper error handling
CREATE OR REPLACE FUNCTION seed_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use a try-catch block to handle any errors gracefully
    BEGIN
        -- Insert credits for new user, ignore if already exists
        INSERT INTO user_credits (user_id, remaining)
        VALUES (NEW.id, 150000)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Log successful credit seeding
        RAISE NOTICE 'Credits seeded for user: %', NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to seed credits for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Always return NEW to allow user creation to continue
    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS trigger_seed_user_credits ON auth.users;

CREATE TRIGGER trigger_seed_user_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION seed_user_credits();

-- Grant necessary permissions to ensure the function can execute
GRANT EXECUTE ON FUNCTION seed_user_credits() TO service_role;
GRANT EXECUTE ON FUNCTION seed_user_credits() TO postgres;

-- Ensure the user_credits table has the correct permissions
GRANT SELECT, INSERT, UPDATE ON user_credits TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Verify the trigger exists by querying the system tables
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name = 'trigger_seed_user_credits'
    AND event_object_table = 'users'
    AND trigger_schema = 'auth';
    
    IF trigger_count = 0 THEN
        RAISE EXCEPTION 'Trigger trigger_seed_user_credits was not created successfully';
    ELSE
        RAISE NOTICE 'Trigger trigger_seed_user_credits verified successfully';
    END IF;
END;r
$$;
