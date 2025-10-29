-- Create project_comments table for collaboration
CREATE TABLE IF NOT EXISTS project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES keyword_research(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('keyword', 'cluster', 'project')),
  subject_id TEXT,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_subject ON project_comments(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_by ON project_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON project_comments(created_at DESC);

-- Enable RLS
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments on projects they have access to
CREATE POLICY "Users can view accessible comments"
  ON project_comments
  FOR SELECT
  USING (
    -- Project owner
    auth.uid() IN (
      SELECT user_id FROM keyword_research WHERE id = project_id
    ) OR
    -- Shared with user
    auth.uid() IN (
      SELECT shared_with_user_id FROM project_shares WHERE project_id = project_comments.project_id
    )
  );

-- Policy: Commenters and editors can add comments
CREATE POLICY "Users with permission can comment"
  ON project_comments
  FOR INSERT
  WITH CHECK (
    -- Project owner
    auth.uid() IN (
      SELECT user_id FROM keyword_research WHERE id = project_id
    ) OR
    -- Has commenter or editor permission
    auth.uid() IN (
      SELECT shared_with_user_id FROM project_shares
      WHERE project_id = project_comments.project_id
      AND permission IN ('commenter', 'editor')
    )
  );

-- Policy: Comment authors can update their own comments
CREATE POLICY "Users can update own comments"
  ON project_comments
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Comment authors and project owners can delete comments
CREATE POLICY "Users can delete own or owned comments"
  ON project_comments
  FOR DELETE
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT user_id FROM keyword_research WHERE id = project_id
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_project_comments_updated_at
  BEFORE UPDATE ON project_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_comments IS 'Comments on projects, keywords, or clusters for team collaboration';
COMMENT ON COLUMN project_comments.subject_type IS 'Type of entity being commented on';
COMMENT ON COLUMN project_comments.subject_id IS 'ID of the specific entity (keyword ID, cluster ID, or null for project-level)';
