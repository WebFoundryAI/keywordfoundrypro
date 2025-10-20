-- Create competitor_cache table for deduplication within 24h
CREATE TABLE public.competitor_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  checksum TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on created_at for easy cleanup of expired cache
CREATE INDEX idx_competitor_cache_created_at ON public.competitor_cache(created_at);

-- Create index on user_id for efficient user-specific queries
CREATE INDEX idx_competitor_cache_user_id ON public.competitor_cache(user_id);

-- Enable Row Level Security
ALTER TABLE public.competitor_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar to competitor_analysis)
CREATE POLICY "Users can view their own cache entries"
ON public.competitor_cache
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cache entries"
ON public.competitor_cache
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache entries"
ON public.competitor_cache
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cache entries"
ON public.competitor_cache
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all cache entries"
ON public.competitor_cache
FOR ALL
USING (is_admin(auth.uid()));

-- Add comment documenting checksum definition
COMMENT ON COLUMN public.competitor_cache.checksum IS 'SHA256 hash of: sha256(lower(your_domain)||''|''||lower(comp_domain)||''|''||coalesce(location_code,'''')||''|''||coalesce(language_code,'''')||''|''||coalesce(limit,''''))';
