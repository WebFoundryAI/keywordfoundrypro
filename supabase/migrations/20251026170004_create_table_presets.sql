-- Create presets table for query/filter templates
-- Supports both system-provided and user-created presets

CREATE TABLE IF NOT EXISTS public.presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL, -- {query, filters, sort, etc.}
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_preset_check CHECK (
    (is_system = true AND user_id IS NULL) OR
    (is_system = false AND user_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON public.presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_is_system ON public.presets(is_system);

-- Auto-update trigger
CREATE TRIGGER update_presets_updated_at
  BEFORE UPDATE ON public.presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read system presets
CREATE POLICY "Anyone can read system presets"
ON public.presets
FOR SELECT
TO authenticated
USING (is_system = true);

-- Policy: Users can read their own presets
CREATE POLICY "Users can read own presets"
ON public.presets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can create their own presets
CREATE POLICY "Users can create own presets"
ON public.presets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND is_system = false);

-- Policy: Users can update their own presets
CREATE POLICY "Users can update own presets"
ON public.presets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND is_system = false);

-- Policy: Users can delete their own presets
CREATE POLICY "Users can delete own presets"
ON public.presets
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND is_system = false);

-- Policy: Admins can manage system presets
CREATE POLICY "Admins can manage system presets"
ON public.presets
FOR ALL
TO authenticated
USING (
  is_system = true
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Seed system presets
INSERT INTO public.presets (name, description, payload, is_system) VALUES
  (
    'E-commerce SEO',
    'Product-focused keywords with commercial intent',
    '{
      "query": "buy online shop",
      "filters": {
        "minVolume": 100,
        "maxDifficulty": 60,
        "intent": ["commercial", "transactional"]
      },
      "sort": "volume"
    }'::jsonb,
    true
  ),
  (
    'Blog Content Ideas',
    'Informational keywords for content marketing',
    '{
      "query": "how to what is guide",
      "filters": {
        "minVolume": 50,
        "intent": ["informational"]
      },
      "sort": "volume"
    }'::jsonb,
    true
  ),
  (
    'Local Business',
    'Location-based keywords for local SEO',
    '{
      "query": "near me local",
      "filters": {
        "minVolume": 20,
        "intent": ["local", "commercial"]
      },
      "sort": "difficulty"
    }'::jsonb,
    true
  ),
  (
    'Low Competition Wins',
    'High volume, low difficulty opportunities',
    '{
      "query": "",
      "filters": {
        "minVolume": 500,
        "maxDifficulty": 30
      },
      "sort": "volume"
    }'::jsonb,
    true
  ),
  (
    'Question Keywords',
    'FAQ and question-based content opportunities',
    '{
      "query": "what how why when where",
      "filters": {
        "minVolume": 100,
        "intent": ["informational"]
      },
      "sort": "volume"
    }'::jsonb,
    true
  );

COMMENT ON TABLE public.presets IS 'Query/filter presets for quick application; supports system and user presets';
