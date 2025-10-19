-- Create table for DataForSEO API usage tracking
CREATE TABLE public.dataforseo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  module TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_payload JSONB,
  response_status INTEGER,
  credits_used NUMERIC(10, 6),
  cost_usd NUMERIC(10, 6),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dataforseo_usage ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all usage"
  ON public.dataforseo_usage
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert usage"
  ON public.dataforseo_usage
  FOR INSERT
  WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_dataforseo_usage_user_id ON public.dataforseo_usage(user_id);
CREATE INDEX idx_dataforseo_usage_timestamp ON public.dataforseo_usage(timestamp DESC);
CREATE INDEX idx_dataforseo_usage_module ON public.dataforseo_usage(module);