-- Create SERP snapshots table for storing search result previews
CREATE TABLE IF NOT EXISTS public.serp_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.keyword_research(id) ON DELETE CASCADE,
  keyword_text TEXT NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_serp_snapshots_project_id
ON public.serp_snapshots(project_id);

CREATE INDEX IF NOT EXISTS idx_serp_snapshots_keyword_text
ON public.serp_snapshots(keyword_text);

CREATE INDEX IF NOT EXISTS idx_serp_snapshots_created_at
ON public.serp_snapshots(created_at DESC);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_serp_snapshots_project_keyword
ON public.serp_snapshots(project_id, keyword_text);

-- Enable RLS
ALTER TABLE public.serp_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view snapshots for their own projects
CREATE POLICY "Users can view their own SERP snapshots"
ON public.serp_snapshots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.keyword_research kr
    WHERE kr.id = serp_snapshots.project_id
    AND kr.user_id = auth.uid()
  )
);

-- Policy: Users can insert snapshots for their own projects
CREATE POLICY "Users can insert SERP snapshots for their projects"
ON public.serp_snapshots
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.keyword_research kr
    WHERE kr.id = serp_snapshots.project_id
    AND kr.user_id = auth.uid()
  )
);

-- Policy: Users can delete snapshots for their own projects
CREATE POLICY "Users can delete their own SERP snapshots"
ON public.serp_snapshots
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.keyword_research kr
    WHERE kr.id = serp_snapshots.project_id
    AND kr.user_id = auth.uid()
  )
);

COMMENT ON TABLE public.serp_snapshots IS 'Stores SERP (Search Engine Results Page) snapshots for keywords, captured at query time to avoid additional API calls';
COMMENT ON COLUMN public.serp_snapshots.snapshot_json IS 'JSON snapshot containing top-10 results with titles, URLs, domains, and content types';
