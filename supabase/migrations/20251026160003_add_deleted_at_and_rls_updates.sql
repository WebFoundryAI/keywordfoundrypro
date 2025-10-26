-- Add deleted_at column to user-owned tables for soft-delete functionality
-- This allows 30-day retention before permanent deletion

-- Add deleted_at to projects table
ALTER TABLE public.projects
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_projects_deleted_at
ON public.projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add deleted_at to project_snapshots table
ALTER TABLE public.project_snapshots
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_project_snapshots_deleted_at
ON public.project_snapshots(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add deleted_at to cached_results table
ALTER TABLE public.cached_results
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_cached_results_deleted_at
ON public.cached_results(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add deleted_at to exports table
ALTER TABLE public.exports
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_exports_deleted_at
ON public.exports(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add deleted_at to clusters table
ALTER TABLE public.clusters
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_clusters_deleted_at
ON public.clusters(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add deleted_at to cluster_members table
ALTER TABLE public.cluster_members
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_cluster_members_deleted_at
ON public.cluster_members(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add deleted_at to serp_snapshots table
ALTER TABLE public.serp_snapshots
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_serp_snapshots_deleted_at
ON public.serp_snapshots(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to hide soft-deleted rows from non-admins
-- Projects: Update SELECT policy
DROP POLICY IF EXISTS "Users can read own projects" ON public.projects;
CREATE POLICY "Users can read own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND deleted_at IS NULL
);

-- Projects: Admin can see all including soft-deleted
DROP POLICY IF EXISTS "Admins can read all projects" ON public.projects;
CREATE POLICY "Admins can read all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Project Snapshots: Update SELECT policy
DROP POLICY IF EXISTS "Users can read own snapshots" ON public.project_snapshots;
CREATE POLICY "Users can read own snapshots"
ON public.project_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_snapshots.project_id
    AND projects.user_id = auth.uid()
    AND projects.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Project Snapshots: Admin can see all
DROP POLICY IF EXISTS "Admins can read all snapshots" ON public.project_snapshots;
CREATE POLICY "Admins can read all snapshots"
ON public.project_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Cached Results: Update SELECT policy
DROP POLICY IF EXISTS "Users can read own cached results" ON public.cached_results;
CREATE POLICY "Users can read own cached results"
ON public.cached_results
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND deleted_at IS NULL
);

-- Cached Results: Admin can see all
DROP POLICY IF EXISTS "Admins can read all cached results" ON public.cached_results;
CREATE POLICY "Admins can read all cached results"
ON public.cached_results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Exports: Update SELECT policy
DROP POLICY IF EXISTS "Users can read own exports" ON public.exports;
CREATE POLICY "Users can read own exports"
ON public.exports
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND deleted_at IS NULL
);

-- Exports: Admin can see all
DROP POLICY IF EXISTS "Admins can read all exports" ON public.exports;
CREATE POLICY "Admins can read all exports"
ON public.exports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Clusters: Update SELECT policy
DROP POLICY IF EXISTS "Users can read own clusters" ON public.clusters;
CREATE POLICY "Users can read own clusters"
ON public.clusters
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND deleted_at IS NULL
);

-- Clusters: Admin can see all
DROP POLICY IF EXISTS "Admins can read all clusters" ON public.clusters;
CREATE POLICY "Admins can read all clusters"
ON public.clusters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Cluster Members: Update SELECT policy
DROP POLICY IF EXISTS "Users can read cluster members" ON public.cluster_members;
CREATE POLICY "Users can read cluster members"
ON public.cluster_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clusters
    WHERE clusters.id = cluster_members.cluster_id
    AND clusters.user_id = auth.uid()
    AND clusters.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Cluster Members: Admin can see all
DROP POLICY IF EXISTS "Admins can read all cluster members" ON public.cluster_members;
CREATE POLICY "Admins can read all cluster members"
ON public.cluster_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- SERP Snapshots: Update SELECT policy
DROP POLICY IF EXISTS "Users can read own serp snapshots" ON public.serp_snapshots;
CREATE POLICY "Users can read own serp snapshots"
ON public.serp_snapshots
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND deleted_at IS NULL
);

-- SERP Snapshots: Admin can see all
DROP POLICY IF EXISTS "Admins can read all serp snapshots" ON public.serp_snapshots;
CREATE POLICY "Admins can read all serp snapshots"
ON public.serp_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

COMMENT ON COLUMN public.projects.deleted_at IS 'Soft-delete timestamp. Rows with deleted_at are hidden from non-admins. Null = active, not-null = soft-deleted.';
COMMENT ON COLUMN public.project_snapshots.deleted_at IS 'Soft-delete timestamp. Cascades from parent project deletion.';
COMMENT ON COLUMN public.cached_results.deleted_at IS 'Soft-delete timestamp for cache entries.';
COMMENT ON COLUMN public.exports.deleted_at IS 'Soft-delete timestamp for exports.';
COMMENT ON COLUMN public.clusters.deleted_at IS 'Soft-delete timestamp for clustering analysis.';
COMMENT ON COLUMN public.cluster_members.deleted_at IS 'Soft-delete timestamp cascading from parent cluster.';
COMMENT ON COLUMN public.serp_snapshots.deleted_at IS 'Soft-delete timestamp for SERP data.';
