-- Add Stripe price IDs to subscription_plans table
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_monthly ON public.subscription_plans(stripe_price_id_monthly);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_yearly ON public.subscription_plans(stripe_price_id_yearly);

-- Drop and recreate get_user_subscription function with Stripe fields
DROP FUNCTION IF EXISTS public.get_user_subscription(uuid);

CREATE OR REPLACE FUNCTION public.get_user_subscription(user_id_param UUID)
RETURNS TABLE (
  tier subscription_tier,
  status TEXT,
  is_trial BOOLEAN,
  trial_ends_at TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.tier,
    us.status,
    (us.trial_ends_at IS NOT NULL AND us.trial_ends_at > now()) as is_trial,
    us.trial_ends_at,
    us.current_period_end as period_end,
    us.stripe_customer_id,
    us.stripe_subscription_id
  FROM user_subscriptions us
  WHERE us.user_id = user_id_param;
END;
$$;