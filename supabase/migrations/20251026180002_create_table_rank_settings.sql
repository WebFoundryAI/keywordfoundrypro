-- Create rank_settings table for per-project rank tracking configuration
-- Controls whether rank tracking is enabled and quota limits

CREATE TABLE IF NOT EXISTS public.rank_settings (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  daily_quota INTEGER NOT NULL DEFAULT 25, -- Max keywords to check per day
  last_run_at TIMESTAMPTZ,
  keywords_checked_today INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update trigger
CREATE TRIGGER update_rank_settings_updated_at
  BEFORE UPDATE ON public.rank_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.rank_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage settings for their own projects
CREATE POLICY "Users can manage own project rank settings"
ON public.rank_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = rank_settings.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Policy: Shared users can read rank settings
CREATE POLICY "Shared users can read rank settings"
ON public.rank_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = rank_settings.project_id
    AND EXISTS (
      SELECT 1 FROM public.project_shares
      WHERE project_shares.project_id = projects.id
      AND project_shares.invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

-- Policy: Admins can manage all rank settings
CREATE POLICY "Admins can manage all rank settings"
ON public.rank_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Function to auto-create rank settings on project creation
CREATE OR REPLACE FUNCTION create_default_rank_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.rank_settings (project_id, enabled, daily_quota)
  VALUES (NEW.id, false, 25)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_project_created_rank_settings
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION create_default_rank_settings();

COMMENT ON TABLE public.rank_settings IS 'Configuration for daily rank tracking per project';
