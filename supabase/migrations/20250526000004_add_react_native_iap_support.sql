-- Add support for react-native-iap (both iOS and Android)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('ios', 'android')) DEFAULT 'ios';

-- Create index for transaction_id lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_transaction_id ON user_subscriptions(transaction_id);

-- Update the unique constraint to support both original_transaction_id and transaction_id
-- First drop the existing constraint
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_original_transaction_id_purchase_date_ms_key;

-- Add new unique constraint that works for both legacy and new formats
-- Use a unique index instead of constraint for more flexibility
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_transaction_unique 
ON user_subscriptions(user_id, COALESCE(transaction_id, original_transaction_id), purchase_date_ms);

-- Update existing records to have transaction_id = original_transaction_id for compatibility
UPDATE user_subscriptions 
SET transaction_id = original_transaction_id 
WHERE transaction_id IS NULL;
