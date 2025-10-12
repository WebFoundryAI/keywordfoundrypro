-- Part 1: IMMEDIATE FIX - Create missing user_usage record for admin user
-- This ensures the admin user has a usage record for the current period
INSERT INTO public.user_usage (user_id, period_start, period_end, keywords_used, serp_analyses_used, related_keywords_used)
SELECT 
  us.user_id,
  us.current_period_start,
  us.current_period_end,
  0,
  0,
  0
FROM public.user_subscriptions us
WHERE us.user_id NOT IN (
  SELECT user_id FROM public.user_usage WHERE period_end > now()
)
ON CONFLICT (user_id, period_start) DO NOTHING;

-- Part 2: PREVENTIVE FIX - Create function to ensure user_usage record exists
CREATE OR REPLACE FUNCTION public.ensure_user_usage_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user_usage record for the subscription period
  INSERT INTO public.user_usage (
    user_id,
    period_start,
    period_end,
    keywords_used,
    serp_analyses_used,
    related_keywords_used
  )
  VALUES (
    NEW.user_id,
    NEW.current_period_start,
    NEW.current_period_end,
    0,
    0,
    0
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    period_end = EXCLUDED.period_end,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_subscriptions to auto-create usage records
DROP TRIGGER IF EXISTS create_usage_on_subscription ON public.user_subscriptions;
CREATE TRIGGER create_usage_on_subscription
  AFTER INSERT OR UPDATE OF current_period_start, current_period_end
  ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_usage_record();

-- Part 3: DEFENSIVE FIX - Make increment_usage more robust
CREATE OR REPLACE FUNCTION public.increment_usage(user_id_param uuid, action_type text, amount integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start_date TIMESTAMPTZ;
  period_end_date TIMESTAMPTZ;
BEGIN
  -- Get current billing period from subscription
  SELECT 
    current_period_start,
    current_period_end
  INTO period_start_date, period_end_date
  FROM user_subscriptions
  WHERE user_id = user_id_param;

  -- If no subscription found or dates are NULL, use current time + 30 days as fallback
  IF period_start_date IS NULL OR period_end_date IS NULL THEN
    period_start_date := now();
    period_end_date := now() + interval '30 days';
  END IF;

  -- Upsert usage record with proper conflict handling
  INSERT INTO user_usage (
    user_id, 
    period_start, 
    period_end, 
    keywords_used, 
    serp_analyses_used, 
    related_keywords_used
  )
  VALUES (
    user_id_param,
    period_start_date,
    period_end_date,
    CASE WHEN action_type = 'keyword' THEN amount ELSE 0 END,
    CASE WHEN action_type = 'serp' THEN amount ELSE 0 END,
    CASE WHEN action_type = 'related' THEN amount ELSE 0 END
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    keywords_used = CASE 
      WHEN action_type = 'keyword' 
      THEN user_usage.keywords_used + amount 
      ELSE user_usage.keywords_used 
    END,
    serp_analyses_used = CASE 
      WHEN action_type = 'serp' 
      THEN user_usage.serp_analyses_used + amount 
      ELSE user_usage.serp_analyses_used 
    END,
    related_keywords_used = CASE 
      WHEN action_type = 'related' 
      THEN user_usage.related_keywords_used + amount 
      ELSE user_usage.related_keywords_used 
    END,
    period_end = EXCLUDED.period_end,
    updated_at = now();
END;
$$;