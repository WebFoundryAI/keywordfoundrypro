-- Create optimized RPC function that combines admin check, subscription, and plan queries
CREATE OR REPLACE FUNCTION public.get_user_subscription_details(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin_user boolean;
  effective_tier subscription_tier;
  subscription_data jsonb;
  plan_data jsonb;
  result jsonb;
BEGIN
  -- Check if user is admin
  SELECT is_admin(user_id_param) INTO is_admin_user;
  
  -- Get subscription data
  SELECT jsonb_build_object(
    'tier', us.tier,
    'status', us.status,
    'is_trial', (us.trial_ends_at IS NOT NULL AND us.trial_ends_at > now()),
    'trial_ends_at', us.trial_ends_at,
    'period_end', us.current_period_end,
    'stripe_customer_id', us.stripe_customer_id,
    'stripe_subscription_id', us.stripe_subscription_id
  ) INTO subscription_data
  FROM user_subscriptions us
  WHERE us.user_id = user_id_param;
  
  -- Determine effective tier (admins get 'professional' tier)
  IF is_admin_user THEN
    effective_tier := 'professional'::subscription_tier;
  ELSIF subscription_data IS NOT NULL THEN
    effective_tier := (subscription_data->>'tier')::subscription_tier;
  ELSE
    effective_tier := 'free_trial'::subscription_tier;
  END IF;
  
  -- Get plan data based on effective tier
  SELECT jsonb_build_object(
    'tier', sp.tier,
    'name', sp.name,
    'price_monthly', sp.price_monthly,
    'price_yearly', sp.price_yearly,
    'keywords_per_month', sp.keywords_per_month,
    'serp_analyses_per_month', sp.serp_analyses_per_month,
    'related_keywords_per_month', sp.related_keywords_per_month,
    'max_saved_projects', sp.max_saved_projects,
    'features', sp.features
  ) INTO plan_data
  FROM subscription_plans sp
  WHERE sp.tier = effective_tier;
  
  -- Build final result
  result := jsonb_build_object(
    'effectiveTier', effective_tier,
    'isAdmin', is_admin_user,
    'subscription', subscription_data,
    'plan', plan_data
  );
  
  RETURN result;
END;
$function$;