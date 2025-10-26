-- Create cluster_members table for storing keywords within each cluster
-- Links keywords to their parent cluster with representative flag

CREATE TABLE IF NOT EXISTS public.cluster_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  keyword_id UUID NULL,
  keyword_text TEXT NOT NULL,
  is_representative BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cluster_members_cluster_id ON public.cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_members_keyword_id ON public.cluster_members(keyword_id);
CREATE INDEX IF NOT EXISTS idx_cluster_members_representative ON public.cluster_members(cluster_id, is_representative) WHERE is_representative = true;

-- RLS policies
ALTER TABLE public.cluster_members ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to cluster_members"
  ON public.cluster_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view cluster members for their own projects
CREATE POLICY "Users can view cluster members for their projects"
  ON public.cluster_members
  FOR SELECT
  USING (
    cluster_id IN (
      SELECT id FROM public.clusters
      WHERE project_id IN (
        SELECT id FROM public.keyword_research
        WHERE user_id = auth.uid()
      )
    )
  );

-- Constraint: exactly one representative per cluster
CREATE UNIQUE INDEX IF NOT EXISTS idx_cluster_members_one_representative
  ON public.cluster_members(cluster_id)
  WHERE is_representative = true;

-- Comments
COMMENT ON TABLE public.cluster_members IS 'Keywords belonging to a cluster, with one representative per cluster';
COMMENT ON COLUMN public.cluster_members.keyword_id IS 'Reference to keyword_research row if available, otherwise NULL';
COMMENT ON COLUMN public.cluster_members.keyword_text IS 'Actual keyword text stored for CSV imports or deleted keywords';
COMMENT ON COLUMN public.cluster_members.is_representative IS 'Exactly one member per cluster should be the representative (pillar)';
