-- Create response_cache table for 24h caching
CREATE TABLE IF NOT EXISTS response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  meta JSONB
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_response_cache_key ON response_cache(key);
CREATE INDEX IF NOT EXISTS idx_response_cache_user_id ON response_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_response_cache_expires_at ON response_cache(expires_at);

-- Enable RLS
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own cached responses
CREATE POLICY "Users can read own cache"
  ON response_cache
  FOR SELECT
  USING (
    user_id IS NULL OR -- Public cache entries
    auth.uid() = user_id OR -- User's own cache
    is_admin(auth.uid()) -- Admins can see all
  );

-- Policy: Users can insert their own cached responses
CREATE POLICY "Users can insert own cache"
  ON response_cache
  FOR INSERT
  WITH CHECK (
    user_id IS NULL OR -- Public cache entries
    auth.uid() = user_id
  );

-- Policy: Users can update their own cached responses
CREATE POLICY "Users can update own cache"
  ON response_cache
  FOR UPDATE
  USING (
    user_id IS NULL OR
    auth.uid() = user_id OR
    is_admin(auth.uid())
  );

-- Policy: Users can delete their own cached responses
CREATE POLICY "Users can delete own cache"
  ON response_cache
  FOR DELETE
  USING (
    user_id IS NULL OR
    auth.uid() = user_id OR
    is_admin(auth.uid())
  );

-- Function to automatically clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM response_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON TABLE response_cache IS 'Stores API responses with 24h TTL to reduce external API calls';
COMMENT ON FUNCTION cleanup_expired_cache IS 'Removes expired cache entries and returns count deleted';
