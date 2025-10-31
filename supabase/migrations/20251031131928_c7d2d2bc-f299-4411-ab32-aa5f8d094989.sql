-- Create missing tables: response_cache and user_limits

-- Create response_cache table for API response caching
CREATE TABLE IF NOT EXISTS public.response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_response_cache_key ON public.response_cache(key);
CREATE INDEX IF NOT EXISTS idx_response_cache_expires ON public.response_cache(expires_at);

-- Create user_limits table for tracking usage limits
CREATE TABLE IF NOT EXISTS public.user_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_id text NOT NULL DEFAULT 'free',
  queries_today integer NOT NULL DEFAULT 0,
  last_query_reset timestamptz NOT NULL DEFAULT now(),
  credits_used_this_month integer NOT NULL DEFAULT 0,
  credits_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now() + interval '1 month'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- Response cache policies (service-level only)
CREATE POLICY "Service can manage response cache" ON public.response_cache
  FOR ALL USING (true);

-- User limits policies
CREATE POLICY "Users can view their own limits" ON public.user_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage user limits" ON public.user_limits
  FOR ALL USING (true);

CREATE POLICY "Admins can view all limits" ON public.user_limits
  FOR SELECT USING (is_admin(auth.uid()));

-- Add deleted_at to project_snapshots if not exists
ALTER TABLE public.project_snapshots ADD COLUMN IF NOT EXISTS deleted_at timestamptz;