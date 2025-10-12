-- Fix subscription periods for all users - set proper period_end dates
UPDATE public.user_subscriptions
SET 
  current_period_end = CASE 
    WHEN trial_ends_at IS NOT NULL AND trial_ends_at > current_period_start 
    THEN trial_ends_at  -- Use trial end date
    WHEN current_period_end <= current_period_start 
    THEN current_period_start + interval '30 days'  -- Default 30 day period
    ELSE current_period_end
  END,
  updated_at = now()
WHERE current_period_end <= current_period_start OR current_period_end <= now();

-- This will automatically trigger the ensure_user_usage_record() function
-- which will create/update user_usage records with the correct dates