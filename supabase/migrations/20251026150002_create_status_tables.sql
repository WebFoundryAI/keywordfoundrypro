-- Create status incidents table for tracking system incidents
CREATE TABLE IF NOT EXISTS public.status_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create status components table for tracking system component health
CREATE TABLE IF NOT EXISTS public.status_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('operational', 'degraded', 'outage')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_status_incidents_started_at
ON public.status_incidents(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_incidents_resolved_at
ON public.status_incidents(resolved_at DESC) WHERE resolved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_status_incidents_severity
ON public.status_incidents(severity);

-- Enable RLS
ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_components ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read status incidents and components
CREATE POLICY "Anyone can read status incidents"
ON public.status_incidents
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Anyone can read status components"
ON public.status_components
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy: Only admins can modify status incidents
CREATE POLICY "Admins can insert status incidents"
ON public.status_incidents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update status incidents"
ON public.status_incidents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Only admins can modify status components
CREATE POLICY "Admins can update status components"
ON public.status_components
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Insert default components
INSERT INTO public.status_components (id, name, state) VALUES
  ('api', 'API', 'operational'),
  ('database', 'Database', 'operational'),
  ('dataforseo', 'DataForSEO', 'operational')
ON CONFLICT (id) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_status_incidents_updated_at
  BEFORE UPDATE ON public.status_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.status_incidents IS 'System incidents for the public status page';
COMMENT ON TABLE public.status_components IS 'System components and their health status';
COMMENT ON COLUMN public.status_incidents.severity IS 'Severity: info, warning, or critical';
COMMENT ON COLUMN public.status_components.state IS 'Component state: operational, degraded, or outage';
