-- Update inbox.stevewyman@gmail.com to starter package
UPDATE user_subscriptions 
SET 
  tier = 'starter',
  status = 'active',
  trial_ends_at = NULL,
  current_period_start = now(),
  current_period_end = now() + interval '1 month',
  updated_at = now()
WHERE user_id = 'f1e6df19-78b9-488d-9954-ff4ddbe1987a';

-- Update oaklandgroveltd@gmail.com to starter package
UPDATE user_subscriptions 
SET 
  tier = 'starter',
  status = 'active',
  trial_ends_at = NULL,
  current_period_start = now(),
  current_period_end = now() + interval '1 month',
  updated_at = now()
WHERE user_id = '9715189d-006b-4570-a62f-93978fddbbfe';