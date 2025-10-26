-- Create load test reports table for storing load test results
CREATE TABLE IF NOT EXISTS public.load_test_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  runs INTEGER NOT NULL,
  errors INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms NUMERIC(10,2) NOT NULL,
  p95_latency_ms NUMERIC(10,2) NULL,
  cache_hit_pct NUMERIC(5,2) NULL,
  meta JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_load_test_reports_started_at
ON public.load_test_reports(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_load_test_reports_created_at
ON public.load_test_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.load_test_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read load test reports
CREATE POLICY "Admins can read load test reports"
ON public.load_test_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: System can insert load test reports
CREATE POLICY "System can insert load test reports"
ON public.load_test_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMENT ON TABLE public.load_test_reports IS 'Stores results from load testing runs for performance monitoring';
COMMENT ON COLUMN public.load_test_reports.started_at IS 'When the load test started';
COMMENT ON COLUMN public.load_test_reports.duration_ms IS 'Total duration of the load test in milliseconds';
COMMENT ON COLUMN public.load_test_reports.runs IS 'Number of test runs executed';
COMMENT ON COLUMN public.load_test_reports.errors IS 'Number of errors encountered during the test';
COMMENT ON COLUMN public.load_test_reports.avg_latency_ms IS 'Average latency across all runs';
COMMENT ON COLUMN public.load_test_reports.p95_latency_ms IS '95th percentile latency';
COMMENT ON COLUMN public.load_test_reports.cache_hit_pct IS 'Percentage of cache hits';
COMMENT ON COLUMN public.load_test_reports.meta IS 'Additional metadata about the test run';
