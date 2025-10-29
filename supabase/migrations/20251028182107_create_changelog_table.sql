-- Create changelog table for product updates
CREATE TABLE IF NOT EXISTS changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT,
  category TEXT NOT NULL DEFAULT 'improvement' CHECK (category IN ('feature', 'improvement', 'fix', 'breaking')),
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_changelog_published ON changelog(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_changelog_created_at ON changelog(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_changelog_category ON changelog(category);

-- Enable RLS
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;

-- Public can read published entries
CREATE POLICY "Public can view published changelog entries" ON changelog
  FOR SELECT USING (published = true);

-- Admins can do everything (admin check done at application layer)
CREATE POLICY "Admins can insert changelog entries" ON changelog
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update changelog entries" ON changelog
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete changelog entries" ON changelog
  FOR DELETE USING (true);

CREATE POLICY "Admins can view all changelog entries" ON changelog
  FOR SELECT USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_changelog_updated_at
  BEFORE UPDATE ON changelog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set published_at when published is set to true
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.published = true AND OLD.published = false THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_changelog_published_at
  BEFORE UPDATE ON changelog
  FOR EACH ROW
  EXECUTE FUNCTION set_published_at();
