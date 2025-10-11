-- Drop incorrect foreign key that points to auth.users
ALTER TABLE keyword_research
DROP CONSTRAINT IF EXISTS keyword_research_user_id_fkey;

-- Add correct foreign key constraint pointing to profiles
ALTER TABLE keyword_research
ADD CONSTRAINT keyword_research_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_keyword_research_user_id 
ON keyword_research(user_id);

-- Check if user_subscriptions has the wrong constraint and fix it too
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

-- Add correct foreign key constraint for user_subscriptions
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id 
ON user_subscriptions(user_id);