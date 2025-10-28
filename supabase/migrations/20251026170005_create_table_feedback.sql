-- Create feedback table for NPS and feature requests
-- Captures user feedback with triage workflow

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('nps', 'feature')),
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
  title TEXT,
  body TEXT,
  metadata JSONB, -- Additional context (page, session, etc.)
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'in-progress', 'done', 'wont-fix')),
  triaged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  triaged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nps_requires_score CHECK (
    (kind = 'nps' AND score IS NOT NULL) OR kind != 'nps'
  ),
  CONSTRAINT feature_requires_title CHECK (
    (kind = 'feature' AND title IS NOT NULL) OR kind != 'feature'
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_kind ON public.feedback(kind);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own feedback
CREATE POLICY "Users can read own feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can create feedback
CREATE POLICY "Users can create feedback"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Admins can read all feedback
CREATE POLICY "Admins can read all feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can update feedback (for triage)
CREATE POLICY "Admins can update feedback"
ON public.feedback
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Trigger to set triaged_at and triaged_by when status changes
CREATE OR REPLACE FUNCTION update_feedback_triage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status != 'new' AND OLD.triaged_at IS NULL THEN
    NEW.triaged_at = now();
    NEW.triaged_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_feedback_status_change
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_triage();

COMMENT ON TABLE public.feedback IS 'User feedback: NPS scores and feature requests with triage workflow';
