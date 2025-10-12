-- Create starter subscriptions for both users
INSERT INTO user_subscriptions (
  user_id,
  tier,
  status,
  trial_ends_at,
  current_period_start,
  current_period_end
) VALUES 
(
  'f1e6df19-78b9-488d-9954-ff4ddbe1987a',
  'starter',
  'active',
  NULL,
  now(),
  now() + interval '1 month'
),
(
  '9715189d-006b-4570-a62f-93978fddbbfe',
  'starter',
  'active',
  NULL,
  now(),
  now() + interval '1 month'
)
ON CONFLICT (user_id) DO UPDATE SET
  tier = EXCLUDED.tier,
  status = EXCLUDED.status,
  trial_ends_at = EXCLUDED.trial_ends_at,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = now();