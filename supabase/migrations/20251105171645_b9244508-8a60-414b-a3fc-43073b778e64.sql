-- Update create_trial_subscription trigger function to use 5-day trial
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Create subscription with the selected tier (5-day trial)
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
    now() + interval '5 days',
    now(),
    now() + interval '5 days'
  );
  
  RETURN NEW;
END;
$function$;

-- Update ensure_user_subscription RPC function to use 5-day trial
CREATE OR REPLACE FUNCTION public.ensure_user_subscription(user_id_param uuid)
RETURNS TABLE(user_id uuid, tier subscription_tier, status text, trial_ends_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert trial subscription if none exists (5-day trial)
  INSERT INTO public.user_subscriptions (user_id, tier, status, trial_ends_at, current_period_start, current_period_end)
  VALUES (
    user_id_param, 
    'free_trial'::subscription_tier, 
    'active', 
    now() + interval '5 days',
    now(),
    now() + interval '5 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Return the subscription
  RETURN QUERY
  SELECT us.user_id, us.tier, us.status, us.trial_ends_at
  FROM public.user_subscriptions us
  WHERE us.user_id = user_id_param;
END;
$function$;