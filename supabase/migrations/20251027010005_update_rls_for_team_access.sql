-- Migration: Update RLS policies to support team access
-- Allows project members to access project resources based on their role

-- Helper function to check if user is project member with minimum role
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID, p_min_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
    AND user_id = p_user_id
    AND (
      CASE p_min_role
        WHEN 'viewer' THEN role IN ('viewer', 'commenter', 'editor', 'owner')
        WHEN 'commenter' THEN role IN ('commenter', 'editor', 'owner')
        WHEN 'editor' THEN role IN ('editor', 'owner')
        WHEN 'owner' THEN role = 'owner'
        ELSE false
      END
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update cached_results policies to include team members
DROP POLICY IF EXISTS "Users can view own cached results" ON public.cached_results;
CREATE POLICY "Users can view own and team cached results"
  ON public.cached_results
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.projects WHERE id = cached_results.project_id
    )
    OR
    public.is_project_member(cached_results.project_id, auth.uid(), 'viewer')
  );

-- Update serp_snapshots policies to include team members
DROP POLICY IF EXISTS "Users can view own snapshots" ON public.serp_snapshots;
CREATE POLICY "Users can view own and team snapshots"
  ON public.serp_snapshots
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.projects WHERE id = serp_snapshots.project_id
    )
    OR
    public.is_project_member(serp_snapshots.project_id, auth.uid(), 'viewer')
  );

-- Team members with editor role can create snapshots
CREATE POLICY "Editors can create snapshots"
  ON public.serp_snapshots
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      auth.uid() IN (
        SELECT user_id FROM public.projects WHERE id = serp_snapshots.project_id
      )
      OR
      public.is_project_member(serp_snapshots.project_id, auth.uid(), 'editor')
    )
  );

-- Update projects policies to include team members
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own and team projects"
  ON public.projects
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    auth.uid() IN (
      SELECT user_id FROM public.project_members WHERE project_id = projects.id
    )
  );

-- Only owners can update projects
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Owners can update projects"
  ON public.projects
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    public.is_project_member(projects.id, auth.uid(), 'owner')
  );

-- Only owners can delete projects
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Owners can delete projects"
  ON public.projects
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    public.is_project_member(projects.id, auth.uid(), 'owner')
  );

COMMENT ON FUNCTION public.is_project_member IS 'Check if user has at least the specified role in a project';
