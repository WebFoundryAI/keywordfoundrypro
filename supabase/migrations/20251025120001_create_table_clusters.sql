-- Create clusters table for storing keyword clustering results
-- Admin-created clusters that group keywords by SERP overlap and/or semantic similarity

CREATE TABLE IF NOT EXISTS public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.keyword_research(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  params JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clusters_project_id ON public.clusters(project_id);
CREATE INDEX IF NOT EXISTS idx_clusters_created_by ON public.clusters(created_by);
CREATE INDEX IF NOT EXISTS idx_clusters_created_at ON public.clusters(created_at DESC);

-- RLS policies
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to clusters"
  ON public.clusters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view clusters for their own projects
CREATE POLICY "Users can view clusters for their projects"
  ON public.clusters
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.keyword_research
      WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE public.clusters IS 'Keyword clusters created by admins using SERP overlap and semantic similarity';
COMMENT ON COLUMN public.clusters.params IS 'Clustering parameters used: overlap_threshold, distance_threshold, min_cluster_size, semantic_provider';
