-- Create user_emails mapping table to resolve emails to user IDs for sharing
-- This allows inviting users by email even before they have a profile

CREATE TABLE IF NOT EXISTS public.user_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_user_emails_email ON public.user_emails(email);
CREATE INDEX IF NOT EXISTS idx_user_emails_user_id ON public.user_emails(user_id);

-- Enable RLS
ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own email mappings
CREATE POLICY "Users can read own email mappings"
ON public.user_emails
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins can read all email mappings
CREATE POLICY "Admins can read all email mappings"
ON public.user_emails
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Trigger to auto-create email mapping on profile creation
CREATE OR REPLACE FUNCTION create_user_email_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_emails (user_id, email, verified)
  VALUES (NEW.user_id, (SELECT email FROM auth.users WHERE id = NEW.user_id), true)
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_email_mapping();

COMMENT ON TABLE public.user_emails IS 'Maps emails to user IDs for project sharing invitations';
