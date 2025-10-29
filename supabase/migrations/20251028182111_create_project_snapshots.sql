-- Create project_snapshots table for saving filter/sort/pagination state
CREATE TABLE IF NOT EXISTS project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES keyword_research(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_snapshots_user_id ON project_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_id ON project_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_created_at ON project_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE project_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own snapshots
CREATE POLICY "Users can view own snapshots"
  ON project_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own snapshots
CREATE POLICY "Users can insert own snapshots"
  ON project_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own snapshots
CREATE POLICY "Users can update own snapshots"
  ON project_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own snapshots
CREATE POLICY "Users can delete own snapshots"
  ON project_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_project_snapshots_updated_at
  BEFORE UPDATE ON project_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_snapshots IS 'Stores saved filter/sort/pagination states for projects';
COMMENT ON COLUMN project_snapshots.state IS 'JSON object containing filters, sort, pagination, and column settings';
