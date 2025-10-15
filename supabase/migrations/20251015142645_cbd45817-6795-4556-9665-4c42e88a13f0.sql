-- First create the profile for cloudventuresonline@gmail.com
INSERT INTO profiles (user_id, email, display_name)
VALUES (
  '617b8fd1-17a7-4073-aae3-48a16e460ea0',
  'cloudventuresonline@gmail.com',
  'Cloud Ventures'
)
ON CONFLICT (user_id) DO NOTHING;

-- Then restore active admin subscription
INSERT INTO user_subscriptions (
  user_id, 
  tier, 
  status, 
  current_period_start, 
  current_period_end
)
VALUES (
  '617b8fd1-17a7-4073-aae3-48a16e460ea0',
  'admin'::subscription_tier,
  'active',
  now(),
  now() + interval '1 year'
)
ON CONFLICT (user_id) 
DO UPDATE SET
  tier = 'admin'::subscription_tier,
  status = 'active',
  current_period_start = now(),
  current_period_end = now() + interval '1 year',
  updated_at = now();

-- Ensure usage record exists
INSERT INTO user_usage (
  user_id,
  period_start,
  period_end,
  keywords_used,
  serp_analyses_used,
  related_keywords_used
)
VALUES (
  '617b8fd1-17a7-4073-aae3-48a16e460ea0',
  now(),
  now() + interval '1 year',
  0,
  0,
  0
)
ON CONFLICT (user_id, period_start)
DO UPDATE SET
  period_end = now() + interval '1 year',
  updated_at = now();