-- Create project_comments table
CREATE TABLE public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on project_comments
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_comments
CREATE POLICY "Users can view comments for their projects"
  ON public.project_comments FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own comments"
  ON public.project_comments FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.project_comments FOR DELETE
  USING (created_by = auth.uid());

-- Create project_shares table
CREATE TABLE public.project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  shared_by_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'commenter', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, shared_with_user_id)
);

-- Enable RLS on project_shares
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_shares
CREATE POLICY "Users can view shares they created or received"
  ON public.project_shares FOR SELECT
  USING (shared_by_user_id = auth.uid() OR shared_with_user_id = auth.uid());

CREATE POLICY "Users can create shares for their projects"
  ON public.project_shares FOR INSERT
  WITH CHECK (shared_by_user_id = auth.uid());

CREATE POLICY "Users can delete shares they created"
  ON public.project_shares FOR DELETE
  USING (shared_by_user_id = auth.uid());

CREATE POLICY "Users can update shares they created"
  ON public.project_shares FOR UPDATE
  USING (shared_by_user_id = auth.uid());

-- Create project_snapshots table
CREATE TABLE public.project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  project_id UUID,
  name TEXT NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on project_snapshots
ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_snapshots
CREATE POLICY "Users can view their own snapshots"
  ON public.project_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own snapshots"
  ON public.project_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own snapshots"
  ON public.project_snapshots FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX idx_project_comments_created_by ON public.project_comments(created_by);
CREATE INDEX idx_project_shares_project_id ON public.project_shares(project_id);
CREATE INDEX idx_project_shares_shared_with ON public.project_shares(shared_with_user_id);
CREATE INDEX idx_project_snapshots_user_id ON public.project_snapshots(user_id);
CREATE INDEX idx_project_snapshots_project_id ON public.project_snapshots(project_id);