-- Create api_keys table for per-user API key management
-- Allows users to create/revoke API keys for external access

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the key
  key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "kf_12345...")
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(user_id) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own API keys
CREATE POLICY "Users can manage own API keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins can read all API keys (not the actual keys, just metadata)
CREATE POLICY "Admins can read all API keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Function to update last_used_at
CREATE OR REPLACE FUNCTION update_api_key_last_used(key_hash_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = key_hash_param
  AND revoked_at IS NULL;
END;
$$;

COMMENT ON TABLE public.api_keys IS 'User-generated API keys for external access and browser extension auth';
