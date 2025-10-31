-- Add onboarding columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_seen_tour BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tour_seen_at TIMESTAMPTZ;

-- Add updated_at to project_snapshots
ALTER TABLE project_snapshots 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_project_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_snapshots_updated_at_trigger
BEFORE UPDATE ON project_snapshots
FOR EACH ROW
EXECUTE FUNCTION update_project_snapshots_updated_at();