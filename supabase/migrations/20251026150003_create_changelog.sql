-- Create changelog table for product updates
CREATE TABLE IF NOT EXISTS public.changelog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_changelog_date
ON public.changelog(date DESC);

CREATE INDEX IF NOT EXISTS idx_changelog_created_at
ON public.changelog(created_at DESC);

-- Enable RLS
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read changelog entries
CREATE POLICY "Anyone can read changelog"
ON public.changelog
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy: Only admins can create changelog entries
CREATE POLICY "Admins can insert changelog entries"
ON public.changelog
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Only admins can update changelog entries
CREATE POLICY "Admins can update changelog entries"
ON public.changelog
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Only admins can delete changelog entries
CREATE POLICY "Admins can delete changelog entries"
ON public.changelog
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_changelog_updated_at
  BEFORE UPDATE ON public.changelog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.changelog IS 'Product changelog entries for public changelog page';
COMMENT ON COLUMN public.changelog.date IS 'Date of the changelog entry (for display)';
COMMENT ON COLUMN public.changelog.title IS 'Title of the changelog entry';
COMMENT ON COLUMN public.changelog.body IS 'Body content of the changelog entry (supports Markdown)';
