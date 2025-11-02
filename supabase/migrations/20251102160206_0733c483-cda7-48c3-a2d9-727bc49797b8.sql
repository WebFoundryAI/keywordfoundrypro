-- Fix remaining functions without search_path

-- Fix ensure_user_subscription function
CREATE OR REPLACE FUNCTION public.ensure_user_subscription(user_id_param uuid)
RETURNS TABLE(user_id uuid, tier subscription_tier, status text, trial_ends_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Insert trial subscription if none exists
  insert into public.user_subscriptions (user_id, tier, status, trial_ends_at, current_period_start, current_period_end)
  values (
    user_id_param, 
    'free_trial'::subscription_tier, 
    'active', 
    now() + interval '14 days',
    now(),
    now() + interval '14 days'
  )
  on conflict (user_id) do nothing;

  -- Return the subscription
  return query
  select us.user_id, us.tier, us.status, us.trial_ends_at
  from public.user_subscriptions us
  where us.user_id = user_id_param;
end $function$;

-- Fix increment_query_count function
CREATE OR REPLACE FUNCTION public.increment_query_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO user_limits (user_id, queries_today, last_query_reset)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    queries_today = user_limits.queries_today + 1,
    updated_at = now();
END;
$function$;

-- Fix increment_credit_usage function
CREATE OR REPLACE FUNCTION public.increment_credit_usage(p_user_id uuid, p_credits integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO user_limits (user_id, credits_used_this_month, credits_reset_at)
  VALUES (p_user_id, p_credits, date_trunc('month', now() + interval '1 month'))
  ON CONFLICT (user_id)
  DO UPDATE SET 
    credits_used_this_month = user_limits.credits_used_this_month + p_credits,
    updated_at = now();
END;
$function$;