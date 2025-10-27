-- Create rank_checks table for daily position tracking
-- Stores historical rank data for keywords

CREATE TABLE IF NOT EXISTS public.rank_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword_text TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'google',
  location TEXT, -- e.g., "United States" or location code
  device TEXT NOT NULL DEFAULT 'desktop',
  position INTEGER, -- NULL if not found in top 100
  url TEXT, -- The ranking URL if found
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rank_checks_project_id ON public.rank_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_rank_checks_keyword ON public.rank_checks(project_id, keyword_text);
CREATE INDEX IF NOT EXISTS idx_rank_checks_checked_at ON public.rank_checks(checked_at DESC);

-- Enable RLS
ALTER TABLE public.rank_checks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read rank checks for their projects
CREATE POLICY "Users can read own project rank checks"
ON public.rank_checks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = rank_checks.project_id
    AND (
      projects.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_shares
        WHERE project_shares.project_id = projects.id
        AND project_shares.invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  )
);

-- Policy: System can insert rank checks
CREATE POLICY "System can insert rank checks"
ON public.rank_checks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Admins can read all rank checks
CREATE POLICY "Admins can read all rank checks"
ON public.rank_checks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

COMMENT ON TABLE public.rank_checks IS 'Daily position tracking for keywords across search engines';
