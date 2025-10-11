-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_profile_created_create_trial ON public.profiles;

-- Replace the create_trial_subscription function with smarter logic
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
    selected_tier,  -- Use the tier from metadata
    'active',
    now() + interval '7 days',
    now(),
    now() + interval '7 days'
  );
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_profile_created_create_trial
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();