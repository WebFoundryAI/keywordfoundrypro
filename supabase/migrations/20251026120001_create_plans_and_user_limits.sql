-- Create plans table for subscription tiers
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO public.plans (id, name, config) VALUES
  ('free', 'Free', '{
    "queriesPerDay": 5,
    "monthlyCredits": 100,
    "maxRowsPerExport": 100,
    "maxDepth": 1,
    "features": {
      "basicKeywordResearch": true,
      "serpAnalysis": false,
      "competitorAnalysis": false,
      "aiInsights": false,
      "csvExport": true,
      "apiAccess": false
    }
  }'),
  ('trial', 'Trial', '{
    "queriesPerDay": 50,
    "monthlyCredits": 500,
    "maxRowsPerExport": 1000,
    "maxDepth": 3,
    "features": {
      "basicKeywordResearch": true,
      "serpAnalysis": true,
      "competitorAnalysis": true,
      "aiInsights": true,
      "csvExport": true,
      "apiAccess": false
    }
  }'),
  ('pro', 'Pro', '{
    "queriesPerDay": 200,
    "monthlyCredits": 2000,
    "maxRowsPerExport": 10000,
    "maxDepth": 5,
    "features": {
      "basicKeywordResearch": true,
      "serpAnalysis": true,
      "competitorAnalysis": true,
      "aiInsights": true,
      "csvExport": true,
      "apiAccess": true,
      "prioritySupport": true
    }
  }'),
  ('enterprise', 'Enterprise', '{
    "queriesPerDay": -1,
    "monthlyCredits": -1,
    "maxRowsPerExport": -1,
    "maxDepth": 10,
    "features": {
      "basicKeywordResearch": true,
      "serpAnalysis": true,
      "competitorAnalysis": true,
      "aiInsights": true,
      "csvExport": true,
      "apiAccess": true,
      "prioritySupport": true,
      "customIntegrations": true,
      "dedicatedAccount": true
    }
  }')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  config = EXCLUDED.config,
  updated_at = now();

-- Create user_limits table to track user subscription tiers
CREATE TABLE IF NOT EXISTS public.user_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overrides JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for plan lookups
CREATE INDEX IF NOT EXISTS idx_user_limits_plan_id ON public.user_limits(plan_id);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for plans (public read)
CREATE POLICY "Plans are publicly readable"
  ON public.plans
  FOR SELECT
  USING (true);

-- RLS policies for user_limits
CREATE POLICY "Users can view their own limits"
  ON public.user_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all limits"
  ON public.user_limits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert/update user limits"
  ON public.user_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.plans IS 'Subscription plans with entitlements and feature flags';
COMMENT ON TABLE public.user_limits IS 'User subscription tier assignments with optional per-user overrides';
COMMENT ON COLUMN public.plans.config IS 'Plan configuration: queriesPerDay, monthlyCredits, maxRowsPerExport, maxDepth, features';
COMMENT ON COLUMN public.user_limits.overrides IS 'Optional per-user limit overrides (admin-assigned)';
