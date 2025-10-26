-- Add onboarding-related fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_seen_tour'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN has_seen_tour BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tour_seen_at'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN tour_seen_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_sample_project'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN has_sample_project BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_has_seen_tour
ON public.profiles(has_seen_tour);

COMMENT ON COLUMN public.profiles.has_seen_tour IS 'Whether the user has completed the onboarding tour';
COMMENT ON COLUMN public.profiles.tour_seen_at IS 'Timestamp when the user completed the tour';
COMMENT ON COLUMN public.profiles.has_sample_project IS 'Whether a sample project has been created for this user';
