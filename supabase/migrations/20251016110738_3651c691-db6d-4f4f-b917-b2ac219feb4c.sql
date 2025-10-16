-- Clear trial_ends_at for users who upgraded to paid plans
-- This fixes the issue where paid users still show as "trial" in the UI

UPDATE user_subscriptions
SET trial_ends_at = NULL
WHERE tier IN ('professional', 'enterprise')
  AND status = 'active'
  AND trial_ends_at IS NOT NULL;