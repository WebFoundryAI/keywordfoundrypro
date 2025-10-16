-- Update admin user to Professional subscription tier
UPDATE user_subscriptions 
SET 
  tier = 'professional',
  current_period_end = now() + interval '1 year',
  updated_at = now()
WHERE user_id = '617b8fd1-17a7-4073-aae3-48a16e460ea0';