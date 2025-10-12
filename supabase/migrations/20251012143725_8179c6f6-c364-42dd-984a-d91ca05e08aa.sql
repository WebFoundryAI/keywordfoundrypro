-- Recreate the trial subscription function to ensure it's correct
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  selected_tier subscription_tier;
  user_metadata jsonb;
BEGIN
  -- Get the user's metadata from auth.users
  SELECT raw_user_meta_data INTO user_metadata
  FROM auth.users
  WHERE id = NEW.user_id;
  
  -- Extract selected_plan from metadata, default to 'free_trial'
  selected_tier := COALESCE(
    (user_metadata->>'selected_plan')::subscription_tier,
    'free_trial'::subscription_tier
  );
  
  -- Create subscription with the selected tier
  INSERT INTO user_subscriptions (
    user_id,
    tier,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.user_id,
    selected_tier,
    'active',
    now() + interval '7 days',
    now(),
    now() + interval '7 days'
  );
  
  RETURN NEW;
END;
$function$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_create_trial ON public.profiles;

-- Recreate the trigger to fire on new profiles
CREATE TRIGGER on_profile_created_create_trial
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- Fix the existing affected user (bryaninbangkok@gmail.com)
INSERT INTO user_subscriptions (
  user_id,
  tier,
  status,
  trial_ends_at,
  current_period_start,
  current_period_end
) VALUES (
  'aa901304-8919-4bbb-a83f-37e60939c501',
  'free_trial',
  'active',
  now() + interval '7 days',
  now(),
  now() + interval '7 days'
)
ON CONFLICT (user_id) DO NOTHING;