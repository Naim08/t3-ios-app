-- Add unique constraints needed for ON CONFLICT clauses

-- Add unique constraint on original_transaction_id for user_subscriptions
-- This prevents duplicate subscriptions for the same Apple transaction
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_original_transaction_id_key 
UNIQUE (original_transaction_id);

-- Add unique constraint on transaction_id for user_subscriptions  
-- This prevents duplicate records for the same specific transaction
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_transaction_id_key 
UNIQUE (transaction_id);

-- The iap_events table already has event_id as PRIMARY KEY, so no constraint needed

-- Add unique constraint on user_id for user_credits (if not exists)
-- This ensures one credits record per user
ALTER TABLE user_credits 
ADD CONSTRAINT user_credits_user_id_key 
UNIQUE (user_id);