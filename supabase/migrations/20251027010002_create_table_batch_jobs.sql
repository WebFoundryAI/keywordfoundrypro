-- Migration: Create batch_jobs table for batch keyword imports
-- Tracks CSV/JSON bulk import jobs with progress and validation

CREATE TABLE IF NOT EXISTS public.batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'error')) DEFAULT 'pending',
  input_format TEXT NOT NULL CHECK (input_format IN ('csv', 'json')),
  total INTEGER NOT NULL DEFAULT 0,
  ok INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  meta JSONB,
  CONSTRAINT valid_counts CHECK (ok + failed <= total)
);

-- Indexes for performance
CREATE INDEX idx_batch_jobs_user_id ON public.batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_project_id ON public.batch_jobs(project_id);
CREATE INDEX idx_batch_jobs_status ON public.batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON public.batch_jobs(created_at DESC);

-- Row Level Security
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own batch jobs
CREATE POLICY "Users can view own batch jobs"
  ON public.batch_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create batch jobs for projects they own or are members of
CREATE POLICY "Users can create batch jobs"
  ON public.batch_jobs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      auth.uid() IN (
        SELECT user_id FROM public.projects WHERE id = batch_jobs.project_id
      )
      OR
      auth.uid() IN (
        SELECT user_id FROM public.project_members WHERE project_id = batch_jobs.project_id
      )
    )
  );

-- Policy: Users can update their own batch jobs
CREATE POLICY "Users can update own batch jobs"
  ON public.batch_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all batch jobs
CREATE POLICY "Admins can view all batch jobs"
  ON public.batch_jobs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.batch_jobs TO authenticated;
