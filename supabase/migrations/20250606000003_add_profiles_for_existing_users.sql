-- Add profiles for existing users who don't have one yet
-- This handles users who signed up before the profile system was implemented

DO $$
DECLARE
    user_record RECORD;
    default_avatars TEXT[] := ARRAY['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6'];
    random_avatar TEXT;
BEGIN
    -- Loop through all auth.users who don't have a profile yet
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.user_profiles up ON au.id = up.id
        WHERE up.id IS NULL
    LOOP
        -- Select a random default avatar for each user
        random_avatar := default_avatars[floor(random() * array_length(default_avatars, 1) + 1)];
        
        -- Create profile for this user
        INSERT INTO public.user_profiles (
            id, 
            display_name, 
            default_avatar_id, 
            avatar_type,
            created_at,
            updated_at
        )
        VALUES (
            user_record.id,
            COALESCE(
                user_record.raw_user_meta_data->>'full_name', 
                user_record.raw_user_meta_data->>'name',
                split_part(user_record.email, '@', 1)
            ),
            random_avatar,
            'default',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING; -- Safety check in case profile somehow exists
        
        RAISE NOTICE 'Created profile for user: % with avatar: %', user_record.email, random_avatar;
    END LOOP;
    
    RAISE NOTICE 'Finished creating profiles for existing users';
END $$;