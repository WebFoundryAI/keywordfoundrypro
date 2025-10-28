-- Create comments table for collaboration
-- Allows commenting on keywords and clusters within projects

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('keyword', 'cluster')),
  subject_id TEXT NOT NULL, -- keyword text or cluster UUID
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON public.comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_subject ON public.comments(project_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);

-- Auto-update updated_at trigger
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read comments on projects they own or have access to
CREATE POLICY "Users can read accessible project comments"
ON public.comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = comments.project_id
    AND (
      projects.user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.project_shares
        WHERE project_shares.project_id = projects.id
        AND project_shares.invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  )
);

-- Policy: Project owners and commenters can insert comments
CREATE POLICY "Owners and commenters can insert comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = comments.project_id
    AND (
      projects.user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.project_shares
        WHERE project_shares.project_id = projects.id
        AND project_shares.invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND project_shares.role = 'commenter'
      )
    )
  )
);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (author_id = auth.uid());

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.comments
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- Policy: Project owners can delete any comments on their projects
CREATE POLICY "Project owners can delete project comments"
ON public.comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = comments.project_id
    AND projects.user_id = auth.uid()
  )
);

COMMENT ON TABLE public.comments IS 'Comment threads on keywords and clusters for collaboration';
