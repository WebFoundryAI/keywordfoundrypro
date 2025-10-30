-- Per-user onboarding preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_onboarding boolean DEFAULT true;  -- true = show tour

-- Optional: index for frequent reads
CREATE INDEX IF NOT EXISTS idx_profiles_show_onboarding ON public.profiles(show_onboarding);

COMMENT ON COLUMN public.profiles.show_onboarding IS 'Whether to show onboarding tour to user (default true, set false when user clicks "Don''t show again")';
