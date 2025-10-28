-- Create backup manifests table for tracking nightly backups
CREATE TABLE IF NOT EXISTS public.backup_manifests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  tables JSONB NOT NULL,
  duration_ms INTEGER NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_manifests_run_at
ON public.backup_manifests(run_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_manifests_status
ON public.backup_manifests(status);

CREATE INDEX IF NOT EXISTS idx_backup_manifests_created_at
ON public.backup_manifests(created_at DESC);

-- Enable RLS
ALTER TABLE public.backup_manifests ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read backup manifests
CREATE POLICY "Admins can read backup manifests"
ON public.backup_manifests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: System can insert backup manifests
CREATE POLICY "System can insert backup manifests"
ON public.backup_manifests
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMENT ON TABLE public.backup_manifests IS 'Tracking manifests for nightly database backups to Supabase Storage';
COMMENT ON COLUMN public.backup_manifests.tables IS 'JSON object with table names as keys and {rows, file, checksum} as values';
COMMENT ON COLUMN public.backup_manifests.status IS 'Backup status: success (all tables), partial (some failed), failed (all failed)';
