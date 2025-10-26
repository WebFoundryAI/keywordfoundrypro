-- Add soft delete support to user-owned tables for GDPR compliance

-- Add deleted_at to keyword_research table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'keyword_research') THEN
    ALTER TABLE public.keyword_research
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

    CREATE INDEX IF NOT EXISTS idx_keyword_research_deleted_at
    ON public.keyword_research(deleted_at)
    WHERE deleted_at IS NOT NULL;
  END IF;
END $$;

-- Add deleted_at to profiles table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

    CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
    ON public.profiles(deleted_at)
    WHERE deleted_at IS NOT NULL;
  END IF;
END $$;

-- Add deleted_at to cached_results table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cached_results') THEN
    ALTER TABLE public.cached_results
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

    CREATE INDEX IF NOT EXISTS idx_cached_results_deleted_at
    ON public.cached_results(deleted_at)
    WHERE deleted_at IS NOT NULL;
  END IF;
END $$;

-- Add deleted_at to project_snapshots table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_snapshots') THEN
    ALTER TABLE public.project_snapshots
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

    CREATE INDEX IF NOT EXISTS idx_project_snapshots_deleted_at
    ON public.project_snapshots(deleted_at)
    WHERE deleted_at IS NOT NULL;
  END IF;
END $$;

-- Add deleted_at to exports table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exports') THEN
    ALTER TABLE public.exports
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

    CREATE INDEX IF NOT EXISTS idx_exports_deleted_at
    ON public.exports(deleted_at)
    WHERE deleted_at IS NOT NULL;
  END IF;
END $$;

-- Add deleted_at to clusters table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clusters') THEN
    ALTER TABLE public.clusters
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

    CREATE INDEX IF NOT EXISTS idx_clusters_deleted_at
    ON public.clusters(deleted_at)
    WHERE deleted_at IS NOT NULL;
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN public.keyword_research.deleted_at IS 'Soft delete timestamp for GDPR compliance';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Soft delete timestamp for GDPR compliance';
COMMENT ON COLUMN public.cached_results.deleted_at IS 'Soft delete timestamp for GDPR compliance';
COMMENT ON COLUMN public.project_snapshots.deleted_at IS 'Soft delete timestamp for GDPR compliance';
COMMENT ON COLUMN public.exports.deleted_at IS 'Soft delete timestamp for GDPR compliance';
COMMENT ON COLUMN public.clusters.deleted_at IS 'Soft delete timestamp for GDPR compliance';
