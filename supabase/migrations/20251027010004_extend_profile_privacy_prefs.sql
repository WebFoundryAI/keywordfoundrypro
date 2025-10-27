-- Migration: Extend profiles table with privacy preferences
-- Adds analytics opt-out and privacy settings

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS privacy_opt_out BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 90 CHECK (data_retention_days IN (30, 90, 365));

-- Create index for privacy lookups
CREATE INDEX idx_profiles_privacy_opt_out ON public.profiles(privacy_opt_out) WHERE privacy_opt_out = true;

COMMENT ON COLUMN public.profiles.privacy_opt_out IS 'User has opted out of non-essential analytics and tracking';
COMMENT ON COLUMN public.profiles.data_retention_days IS 'Number of days to retain user activity logs (30, 90, or 365)';
