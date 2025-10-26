-- Create table for project snapshots (save/restore state)
CREATE TABLE public.project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.keyword_research(id) ON DELETE CASCADE,
  name TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient queries
CREATE INDEX idx_project_snapshots_user_id ON public.project_snapshots(user_id);
CREATE INDEX idx_project_snapshots_project_id ON public.project_snapshots(project_id);
CREATE INDEX idx_project_snapshots_created_at ON public.project_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own snapshots
CREATE POLICY "Users can view own snapshots"
  ON public.project_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own snapshots
CREATE POLICY "Users can insert own snapshots"
  ON public.project_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own snapshots
CREATE POLICY "Users can update own snapshots"
  ON public.project_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own snapshots
CREATE POLICY "Users can delete own snapshots"
  ON public.project_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all snapshots
CREATE POLICY "Admins can view all snapshots"
  ON public.project_snapshots
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Policy: Admins can manage all snapshots
CREATE POLICY "Admins can manage all snapshots"
  ON public.project_snapshots
  FOR ALL
  USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_project_snapshots_updated_at
  BEFORE UPDATE ON public.project_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.project_snapshots IS 'Stores saved states of projects for later restoration';
COMMENT ON COLUMN public.project_snapshots.payload IS 'Contains query params, filter state, sort, and pagination info';
