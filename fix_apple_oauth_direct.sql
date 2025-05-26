-- Direct fix for Apple OAuth database error
-- This script will be executed directly against the remote database

-- First, drop and recreate the trigger function with proper error handling
DROP TRIGGER IF EXISTS trigger_seed_user_credits ON auth.users;

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
        
        -- Log successful credit seeding (only in development)
        RAISE NOTICE 'Credits seeded for user: %', NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to seed credits for user %: %', NEW.id, SQLERRM;
        -- Could also log to a separate error table here if needed
    END;
    
    -- Always return NEW to allow user creation to continue
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_seed_user_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION seed_user_credits();

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION seed_user_credits() TO service_role;
GRANT EXECUTE ON FUNCTION seed_user_credits() TO postgres;
GRANT EXECUTE ON FUNCTION seed_user_credits() TO anon;
GRANT EXECUTE ON FUNCTION seed_user_credits() TO authenticated;

-- Ensure the user_credits table has correct permissions
GRANT SELECT, INSERT, UPDATE ON user_credits TO service_role;
GRANT SELECT, INSERT, UPDATE ON user_credits TO postgres;
GRANT SELECT, INSERT, UPDATE ON user_credits TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Enable RLS on user_credits if it was disabled
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Ensure the RLS policy exists
DO $$
BEGIN
    -- Try to create the policy, ignore if it already exists
    BEGIN
        CREATE POLICY "Users can manage own credits" ON user_credits
            FOR ALL USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN
        -- Policy already exists, which is fine
        NULL;
    END;
END;
$$;

-- Verify everything is working
DO $$
DECLARE
    trigger_count INTEGER;
    table_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Check trigger exists
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name = 'trigger_seed_user_credits'
    AND event_object_table = 'users'
    AND trigger_schema = 'auth';
    
    -- Check table exists
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name = 'user_credits'
    AND table_schema = 'public';
    
    -- Check policy exists
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'user_credits'
    AND policyname = 'Users can manage own credits';
    
    -- Report status
    IF trigger_count = 1 THEN
        RAISE NOTICE '✅ Trigger trigger_seed_user_credits exists and is active';
    ELSE
        RAISE EXCEPTION '❌ Trigger trigger_seed_user_credits not found';
    END IF;
    
    IF table_count = 1 THEN
        RAISE NOTICE '✅ Table user_credits exists';
    ELSE
        RAISE EXCEPTION '❌ Table user_credits not found';
    END IF;
    
    IF policy_count = 1 THEN
        RAISE NOTICE '✅ RLS policy exists on user_credits';
    ELSE
        RAISE WARNING '⚠️ RLS policy not found on user_credits';
    END IF;
    
    RAISE NOTICE '🎉 Apple OAuth database fix completed successfully!';
END;
$$;
