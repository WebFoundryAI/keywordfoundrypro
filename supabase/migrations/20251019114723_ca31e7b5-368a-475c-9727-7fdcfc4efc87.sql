-- Add freemium usage tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS free_reports_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_reports_renewal_at timestamptz NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.free_reports_used IS 'Number of free reports used in current period';
COMMENT ON COLUMN public.profiles.free_reports_renewal_at IS 'When the free report quota renews';