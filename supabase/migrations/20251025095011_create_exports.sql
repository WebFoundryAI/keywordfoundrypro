-- Create table for tracking data exports
CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.keyword_research(id) ON DELETE SET NULL,
  export_type TEXT NOT NULL CHECK (export_type IN ('csv', 'tsv', 'json')),
  filename TEXT NOT NULL,
  columns JSONB NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes INTEGER,
  filters_applied JSONB,
  sort_applied JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient queries
CREATE INDEX idx_exports_user_id ON public.exports(user_id);
CREATE INDEX idx_exports_project_id ON public.exports(project_id);
CREATE INDEX idx_exports_created_at ON public.exports(created_at DESC);
CREATE INDEX idx_exports_type ON public.exports(export_type);

-- Enable RLS
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own exports
CREATE POLICY "Users can view own exports"
  ON public.exports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own exports
CREATE POLICY "Users can insert own exports"
  ON public.exports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own exports
CREATE POLICY "Users can delete own exports"
  ON public.exports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all exports
CREATE POLICY "Admins can view all exports"
  ON public.exports
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Policy: Admins can manage all exports
CREATE POLICY "Admins can manage all exports"
  ON public.exports
  FOR ALL
  USING (is_admin(auth.uid()));

COMMENT ON TABLE public.exports IS 'Tracks all data exports with metadata for auditing';
COMMENT ON COLUMN public.exports.columns IS 'Array of column names included in export';
COMMENT ON COLUMN public.exports.filters_applied IS 'Filter state at time of export';
COMMENT ON COLUMN public.exports.sort_applied IS 'Sort state at time of export';
