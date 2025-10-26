-- Analytics funnel tracking for signup → first query → export → upgrade
-- Uses materialized view for performance

-- Create analytics_events table for tracking key funnel events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'signup',
    'first_query',
    'first_export',
    'upgrade',
    'downgrade',
    'churn'
  )),
  event_metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
ON public.analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type
ON public.analytics_events(event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
ON public.analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type
ON public.analytics_events(user_id, event_type);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read analytics events
CREATE POLICY "Admins can read analytics events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: System can insert analytics events
CREATE POLICY "System can insert analytics events"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Materialized view for funnel analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS public.analytics_funnel_view AS
SELECT
  p.user_id,
  p.created_at AS signup_at,
  p.plan,
  p.is_admin,
  (SELECT MIN(created_at) FROM public.analytics_events
   WHERE user_id = p.user_id AND event_type = 'first_query') AS first_query_at,
  (SELECT MIN(created_at) FROM public.analytics_events
   WHERE user_id = p.user_id AND event_type = 'first_export') AS first_export_at,
  (SELECT MIN(created_at) FROM public.analytics_events
   WHERE user_id = p.user_id AND event_type = 'upgrade') AS upgraded_at,
  -- Time-to-conversion metrics (in hours)
  EXTRACT(EPOCH FROM (
    (SELECT MIN(created_at) FROM public.analytics_events
     WHERE user_id = p.user_id AND event_type = 'first_query') - p.created_at
  )) / 3600 AS hours_to_first_query,
  EXTRACT(EPOCH FROM (
    (SELECT MIN(created_at) FROM public.analytics_events
     WHERE user_id = p.user_id AND event_type = 'first_export') - p.created_at
  )) / 3600 AS hours_to_first_export,
  EXTRACT(EPOCH FROM (
    (SELECT MIN(created_at) FROM public.analytics_events
     WHERE user_id = p.user_id AND event_type = 'upgrade') - p.created_at
  )) / 3600 AS hours_to_upgrade,
  -- Cohort identification
  DATE_TRUNC('week', p.created_at) AS signup_week,
  DATE_TRUNC('month', p.created_at) AS signup_month
FROM public.profiles p
WHERE p.is_admin = false; -- Exclude admin users from funnel analysis

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_funnel_view_user_id
ON public.analytics_funnel_view(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_funnel_view_signup_week
ON public.analytics_funnel_view(signup_week);

CREATE INDEX IF NOT EXISTS idx_analytics_funnel_view_plan
ON public.analytics_funnel_view(plan);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_analytics_funnel_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.analytics_funnel_view;
END;
$$;

-- Helper view for funnel conversion rates by cohort
CREATE OR REPLACE VIEW public.analytics_funnel_cohorts AS
SELECT
  signup_week,
  plan,
  COUNT(*) AS total_signups,
  COUNT(first_query_at) AS completed_first_query,
  COUNT(first_export_at) AS completed_first_export,
  COUNT(upgraded_at) AS completed_upgrade,
  ROUND(100.0 * COUNT(first_query_at) / COUNT(*), 2) AS pct_first_query,
  ROUND(100.0 * COUNT(first_export_at) / COUNT(*), 2) AS pct_first_export,
  ROUND(100.0 * COUNT(upgraded_at) / COUNT(*), 2) AS pct_upgrade,
  ROUND(AVG(hours_to_first_query), 1) AS avg_hours_to_first_query,
  ROUND(AVG(hours_to_first_export), 1) AS avg_hours_to_first_export,
  ROUND(AVG(hours_to_upgrade), 1) AS avg_hours_to_upgrade
FROM public.analytics_funnel_view
GROUP BY signup_week, plan
ORDER BY signup_week DESC, plan;

-- Helper view for overall funnel metrics
CREATE OR REPLACE VIEW public.analytics_funnel_summary AS
SELECT
  plan,
  COUNT(*) AS total_users,
  COUNT(first_query_at) AS users_with_query,
  COUNT(first_export_at) AS users_with_export,
  COUNT(upgraded_at) AS users_upgraded,
  ROUND(100.0 * COUNT(first_query_at) / COUNT(*), 2) AS conversion_to_query,
  ROUND(100.0 * COUNT(first_export_at) / COUNT(first_query_at), 2) AS conversion_query_to_export,
  ROUND(100.0 * COUNT(upgraded_at) / COUNT(first_export_at), 2) AS conversion_export_to_upgrade,
  ROUND(100.0 * COUNT(upgraded_at) / COUNT(*), 2) AS overall_conversion_to_paid,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours_to_first_query) AS median_hours_to_query,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours_to_first_export) AS median_hours_to_export,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours_to_upgrade) AS median_hours_to_upgrade
FROM public.analytics_funnel_view
GROUP BY plan
ORDER BY plan;

COMMENT ON TABLE public.analytics_events IS 'Tracks key funnel events: signup, first_query, first_export, upgrade, downgrade, churn';
COMMENT ON MATERIALIZED VIEW public.analytics_funnel_view IS 'Materialized view for fast funnel analysis. Refresh with refresh_analytics_funnel_view()';
COMMENT ON VIEW public.analytics_funnel_cohorts IS 'Funnel conversion rates grouped by signup week and plan';
COMMENT ON VIEW public.analytics_funnel_summary IS 'Overall funnel conversion metrics by plan';
