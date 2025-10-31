-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_opt_out boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_retention_days integer DEFAULT 90;

-- Add missing columns to keyword_research table
ALTER TABLE keyword_research 
ADD COLUMN IF NOT EXISTS location_name text,
ADD COLUMN IF NOT EXISTS language_name text;

-- Add comments for documentation
COMMENT ON COLUMN profiles.privacy_opt_out IS 'User opt-out preference for analytics tracking';
COMMENT ON COLUMN profiles.data_retention_days IS 'Number of days to retain user data (default: 90)';
COMMENT ON COLUMN keyword_research.location_name IS 'Human-readable location name for the research';
COMMENT ON COLUMN keyword_research.language_name IS 'Human-readable language name for the research';