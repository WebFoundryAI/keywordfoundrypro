-- Phase 1: Create subscription system tables and functions

-- Create subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free_trial', 'starter', 'professional', 'enterprise', 'admin');

-- Subscription plans table (defines what each tier offers)
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  keywords_per_month INTEGER NOT NULL,
  serp_analyses_per_month INTEGER NOT NULL,
  related_keywords_per_month INTEGER NOT NULL,
  max_saved_projects INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free_trial',
  status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking table
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  keywords_used INTEGER DEFAULT 0,
  serp_analyses_used INTEGER DEFAULT 0,
  related_keywords_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Seed initial pricing plans
INSERT INTO subscription_plans (tier, name, price_monthly, price_yearly, keywords_per_month, serp_analyses_per_month, related_keywords_per_month, max_saved_projects, features) VALUES
  ('free_trial', 'Free Trial', 0, 0, 100, 10, 50, 3, 
   '["7-day free trial", "100 keyword searches", "10 SERP analyses", "50 related keyword searches", "Basic support"]'::jsonb),
  ('starter', 'Starter', 49, 470, 1000, 100, 500, 20,
   '["1,000 keyword searches/month", "100 SERP analyses/month", "500 related keyword searches/month", "20 saved projects", "Email support", "Export to CSV"]'::jsonb),
  ('professional', 'Professional', 99, 950, 5000, 500, 2500, 100,
   '["5,000 keyword searches/month", "500 SERP analyses/month", "2,500 related keyword searches/month", "100 saved projects", "Priority email support", "Advanced filters", "API access", "Bulk export"]'::jsonb),
  ('enterprise', 'Enterprise', 249, 2390, 25000, 2500, 12500, -1,
   '["25,000 keyword searches/month", "2,500 SERP analyses/month", "12,500 related keyword searches/month", "Unlimited projects", "Dedicated account manager", "Custom integrations", "White-label reports", "Phone support"]'::jsonb),
  ('admin', 'Admin', 0, 0, -1, -1, -1, -1,
   '["Unlimited everything", "Full admin access", "Platform management"]'::jsonb);

-- Function to get user's current subscription
CREATE OR REPLACE FUNCTION get_user_subscription(user_id_param UUID)
RETURNS TABLE (
  tier subscription_tier,
  status TEXT,
  is_trial BOOLEAN,
  trial_ends_at TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.tier,
    us.status,
    (us.trial_ends_at IS NOT NULL AND us.trial_ends_at > now()) as is_trial,
    us.trial_ends_at,
    us.current_period_end
  FROM user_subscriptions us
  WHERE us.user_id = user_id_param;
END;
$$;

-- Function to check if user can perform action
CREATE OR REPLACE FUNCTION can_user_perform_action(
  user_id_param UUID,
  action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier subscription_tier;
  is_admin_user BOOLEAN;
  plan_limit INTEGER;
  current_usage INTEGER;
  usage_record RECORD;
BEGIN
  -- Check if admin (admins have unlimited access)
  SELECT is_admin(user_id_param) INTO is_admin_user;
  IF is_admin_user THEN
    RETURN TRUE;
  END IF;

  -- Get user's subscription tier
  SELECT tier INTO user_tier
  FROM user_subscriptions
  WHERE user_id = user_id_param
    AND status = 'active'
    AND current_period_end > now();
  
  -- If no active subscription, deny
  IF user_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get plan limits
  IF action_type = 'keyword' THEN
    SELECT keywords_per_month INTO plan_limit
    FROM subscription_plans
    WHERE tier = user_tier;
  ELSIF action_type = 'serp' THEN
    SELECT serp_analyses_per_month INTO plan_limit
    FROM subscription_plans
    WHERE tier = user_tier;
  ELSIF action_type = 'related' THEN
    SELECT related_keywords_per_month INTO plan_limit
    FROM subscription_plans
    WHERE tier = user_tier;
  END IF;

  -- -1 means unlimited
  IF plan_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Get current period usage
  SELECT * INTO usage_record
  FROM user_usage
  WHERE user_id = user_id_param
    AND period_start <= now()
    AND period_end > now();

  -- Get current usage for action type
  IF action_type = 'keyword' THEN
    current_usage := COALESCE(usage_record.keywords_used, 0);
  ELSIF action_type = 'serp' THEN
    current_usage := COALESCE(usage_record.serp_analyses_used, 0);
  ELSIF action_type = 'related' THEN
    current_usage := COALESCE(usage_record.related_keywords_used, 0);
  END IF;

  RETURN current_usage < plan_limit;
END;
$$;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  user_id_param UUID,
  action_type TEXT,
  amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start_date TIMESTAMPTZ;
  period_end_date TIMESTAMPTZ;
BEGIN
  -- Calculate current billing period
  SELECT 
    current_period_start,
    current_period_end
  INTO period_start_date, period_end_date
  FROM user_subscriptions
  WHERE user_id = user_id_param;

  -- Insert or update usage record
  INSERT INTO user_usage (user_id, period_start, period_end, keywords_used, serp_analyses_used, related_keywords_used)
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
    keywords_used = CASE WHEN action_type = 'keyword' THEN user_usage.keywords_used + amount ELSE user_usage.keywords_used END,
    serp_analyses_used = CASE WHEN action_type = 'serp' THEN user_usage.serp_analyses_used + amount ELSE user_usage.serp_analyses_used END,
    related_keywords_used = CASE WHEN action_type = 'related' THEN user_usage.related_keywords_used + amount ELSE user_usage.related_keywords_used END,
    updated_at = now();
END;
$$;

-- Trigger to create trial subscription for new users
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_subscriptions (
    user_id,
    tier,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.user_id,
    'free_trial',
    'active',
    now() + interval '7 days',
    now(),
    now() + interval '7 days'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_trial
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();

-- Update existing users to have admin tier
INSERT INTO user_subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT 
  ur.user_id,
  'admin'::subscription_tier,
  'active',
  now(),
  now() + interval '100 years'
FROM user_roles ur
WHERE ur.role = 'admin'::app_role
ON CONFLICT (user_id) DO NOTHING;

-- RLS Policies for subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON subscription_plans FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage subscriptions"
  ON user_subscriptions FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for user_usage
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON user_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
  ON user_usage FOR SELECT
  USING (is_admin(auth.uid()));