-- Create project_shares table for project collaboration
CREATE TABLE IF NOT EXISTS project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES keyword_research(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'commenter', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, shared_with_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_with_user_id ON project_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_created_at ON project_shares(created_at DESC);

-- Enable RLS
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shares for projects they own or have access to
CREATE POLICY "Users can view relevant shares"
  ON project_shares
  FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() = shared_with_user_id OR
    auth.uid() IN (
      SELECT user_id FROM keyword_research WHERE id = project_id
    )
  );

-- Policy: Project owners can create shares
CREATE POLICY "Owners can share projects"
  ON project_shares
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM keyword_research WHERE id = project_id
    )
  );

-- Policy: Project owners can update shares
CREATE POLICY "Owners can update shares"
  ON project_shares
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM keyword_research WHERE id = project_id
    )
  );

-- Policy: Project owners and share creators can delete shares
CREATE POLICY "Owners can delete shares"
  ON project_shares
  FOR DELETE
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() IN (
      SELECT user_id FROM keyword_research WHERE id = project_id
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_project_shares_updated_at
  BEFORE UPDATE ON project_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_shares IS 'Manages project sharing and collaboration permissions';
COMMENT ON COLUMN project_shares.permission IS 'viewer: read-only, commenter: can comment, editor: can modify';
