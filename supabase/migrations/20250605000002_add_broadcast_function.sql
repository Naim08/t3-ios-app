-- Create function to broadcast subscription status changes
CREATE OR REPLACE FUNCTION broadcast_subscription_change(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pg_notify to trigger real-time notifications
  -- This will be picked up by Supabase Realtime
  PERFORM pg_notify(
    'sub_status_changed',
    json_build_object(
      'userId', user_id,
      'timestamp', extract(epoch from now())
    )::text
  );
END;
$$;