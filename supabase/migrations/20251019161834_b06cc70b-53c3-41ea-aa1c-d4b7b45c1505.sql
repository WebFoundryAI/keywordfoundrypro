-- Add versioning and payload fields to keyword_clusters
ALTER TABLE keyword_clusters
ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'serp+semantic',
ADD COLUMN IF NOT EXISTS payload jsonb,
ADD COLUMN IF NOT EXISTS job_started_at timestamptz,
ADD COLUMN IF NOT EXISTS job_completed_at timestamptz;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_keyword_clusters_version ON keyword_clusters(version);
CREATE INDEX IF NOT EXISTS idx_keyword_clusters_method ON keyword_clusters(method);