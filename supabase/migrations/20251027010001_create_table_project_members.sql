-- Migration: Create project_members table for team collaboration
-- Enables multi-user access to projects with role-based permissions

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'commenter', 'editor', 'owner')),
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);

-- Row Level Security
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of projects they belong to
CREATE POLICY "Users can view project members"
  ON public.project_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.project_members WHERE project_id = project_members.project_id
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM public.projects WHERE id = project_members.project_id
    )
  );

-- Policy: Only project owners can add members
CREATE POLICY "Project owners can add members"
  ON public.project_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.project_members
      WHERE project_id = project_members.project_id AND role = 'owner'
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM public.projects WHERE id = project_members.project_id
    )
  );

-- Policy: Only project owners can update member roles
CREATE POLICY "Project owners can update members"
  ON public.project_members
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.project_members
      WHERE project_id = project_members.project_id AND role = 'owner'
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM public.projects WHERE id = project_members.project_id
    )
  );

-- Policy: Project owners can remove members
CREATE POLICY "Project owners can remove members"
  ON public.project_members
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.project_members
      WHERE project_id = project_members.project_id AND role = 'owner'
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM public.projects WHERE id = project_members.project_id
    )
  );

-- Function to automatically add project creator as owner
CREATE OR REPLACE FUNCTION public.add_project_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role, added_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add creator as owner when project is created
CREATE TRIGGER add_project_creator_as_owner_trigger
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.add_project_creator_as_owner();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
