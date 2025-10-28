-- Add intent column to cached_results table
DO $$
BEGIN
  -- Add intent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cached_results' AND column_name = 'intent'
  ) THEN
    ALTER TABLE public.cached_results
    ADD COLUMN intent TEXT CHECK (intent IN ('informational', 'navigational', 'commercial', 'transactional'));
  END IF;

  -- Add intent_override column to track user overrides
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cached_results' AND column_name = 'intent_override'
  ) THEN
    ALTER TABLE public.cached_results
    ADD COLUMN intent_override TEXT CHECK (intent_override IN ('informational', 'navigational', 'commercial', 'transactional'));
  END IF;

  -- Add intent_confidence for tracking classification confidence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cached_results' AND column_name = 'intent_confidence'
  ) THEN
    ALTER TABLE public.cached_results
    ADD COLUMN intent_confidence DECIMAL(3,2) CHECK (intent_confidence >= 0 AND intent_confidence <= 1);
  END IF;

  -- Add timestamp for when intent was overridden
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cached_results' AND column_name = 'intent_overridden_at'
  ) THEN
    ALTER TABLE public.cached_results
    ADD COLUMN intent_overridden_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Create index for filtering by intent
CREATE INDEX IF NOT EXISTS idx_cached_results_intent
ON public.cached_results(intent) WHERE intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cached_results_intent_override
ON public.cached_results(intent_override) WHERE intent_override IS NOT NULL;

COMMENT ON COLUMN public.cached_results.intent IS 'Auto-classified search intent (informational, navigational, commercial, transactional)';
COMMENT ON COLUMN public.cached_results.intent_override IS 'User-provided intent override';
COMMENT ON COLUMN public.cached_results.intent_confidence IS 'Confidence score for auto-classified intent (0-1)';
COMMENT ON COLUMN public.cached_results.intent_overridden_at IS 'Timestamp when intent was manually overridden by user';
