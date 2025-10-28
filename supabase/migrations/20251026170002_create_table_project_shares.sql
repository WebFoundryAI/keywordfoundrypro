-- Create project_shares table for collaboration
-- Allows project owners to share with other users as viewer or commenter

CREATE TABLE IF NOT EXISTS public.project_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'commenter')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, invited_email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON public.project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_invited_email ON public.project_shares(invited_email);

-- Enable RLS
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Project owners can manage shares for their projects
CREATE POLICY "Project owners can manage shares"
ON public.project_shares
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_shares.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Policy: Invited users can see shares where they are invited
CREATE POLICY "Invited users can see their shares"
ON public.project_shares
FOR SELECT
TO authenticated
USING (
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Admins can see all shares
CREATE POLICY "Admins can see all shares"
ON public.project_shares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Update projects RLS to allow shared access
DROP POLICY IF EXISTS "Users can read own projects" ON public.projects;
CREATE POLICY "Users can read own or shared projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND deleted_at IS NULL
  OR
  EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_shares.project_id = projects.id
    AND project_shares.invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

COMMENT ON TABLE public.project_shares IS 'Project collaboration: share projects with viewers and commenters';
