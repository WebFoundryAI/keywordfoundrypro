-- Create table for caching API responses (24h TTL)
CREATE TABLE public.cached_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL UNIQUE,
  value_json JSONB NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_hit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count INTEGER NOT NULL DEFAULT 0,
  ttl_seconds INTEGER NOT NULL DEFAULT 86400,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cached_results ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own cached results
CREATE POLICY "Users can view own cached results"
  ON public.cached_results
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cached results"
  ON public.cached_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cached results"
  ON public.cached_results
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cached results"
  ON public.cached_results
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cached results"
  ON public.cached_results
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete all cached results"
  ON public.cached_results
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Service role can insert/update (for Edge Functions)
CREATE POLICY "Service role can insert cached results"
  ON public.cached_results
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update cached results"
  ON public.cached_results
  FOR UPDATE
  USING (true);

-- Indexes for efficient queries
CREATE INDEX idx_cached_results_cache_key ON public.cached_results(cache_key);
CREATE INDEX idx_cached_results_user_id ON public.cached_results(user_id);
CREATE INDEX idx_cached_results_project_id ON public.cached_results(project_id);
CREATE INDEX idx_cached_results_created_at ON public.cached_results(created_at DESC);
CREATE INDEX idx_cached_results_ttl_expiry ON public.cached_results((created_at + (ttl_seconds || ' seconds')::INTERVAL));

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION delete_expired_cache_entries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cached_results
  WHERE created_at + (ttl_seconds || ' seconds')::INTERVAL < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON TABLE cached_results IS 'Caches API responses with 24h TTL to avoid re-charging for identical queries';
COMMENT ON COLUMN cached_results.cache_key IS 'Normalized hash of: seed_query | country | language | depth | endpoint | filters';
COMMENT ON COLUMN cached_results.hit_count IS 'Number of times this cache entry has been used';
COMMENT ON COLUMN cached_results.ttl_seconds IS 'Time-to-live in seconds (default 86400 = 24h)';
