-- Create enum for cluster review status
CREATE TYPE cluster_status AS ENUM ('unreviewed', 'approved', 'rejected');

-- Create keyword_clusters table to track cluster metadata and review status
CREATE TABLE keyword_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES keyword_research(id) ON DELETE CASCADE,
  cluster_id text NOT NULL,
  status cluster_status NOT NULL DEFAULT 'unreviewed',
  keyword_count integer NOT NULL DEFAULT 0,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(research_id, cluster_id)
);

-- Enable RLS
ALTER TABLE keyword_clusters ENABLE ROW LEVEL SECURITY;

-- Admin can view all clusters
CREATE POLICY "Admins can view all clusters"
  ON keyword_clusters
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin can update clusters (for status changes)
CREATE POLICY "Admins can update clusters"
  ON keyword_clusters
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Admin can insert clusters
CREATE POLICY "Admins can insert clusters"
  ON keyword_clusters
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Admin can delete clusters
CREATE POLICY "Admins can delete clusters"
  ON keyword_clusters
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_keyword_clusters_updated_at
  BEFORE UPDATE ON keyword_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_keyword_clusters_status ON keyword_clusters(status);
CREATE INDEX idx_keyword_clusters_research_id ON keyword_clusters(research_id);