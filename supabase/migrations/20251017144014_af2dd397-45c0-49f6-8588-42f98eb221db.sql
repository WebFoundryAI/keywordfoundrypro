-- Create domain_gap_reports table
CREATE TABLE public.domain_gap_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  my_domain TEXT NOT NULL,
  competitor_domain TEXT NOT NULL,
  market TEXT NOT NULL,
  freshness TEXT NOT NULL,
  include_related BOOLEAN NOT NULL DEFAULT false,
  include_serp BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gap_keywords table
CREATE TABLE public.gap_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.domain_gap_reports(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  volume INTEGER,
  difficulty INTEGER,
  cpc NUMERIC,
  their_pos INTEGER,
  your_pos INTEGER,
  delta INTEGER,
  serp_features JSONB,
  opportunity_score NUMERIC,
  kind TEXT NOT NULL CHECK (kind IN ('missing', 'overlap')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gap_pages table
CREATE TABLE public.gap_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.domain_gap_reports(id) ON DELETE CASCADE,
  your_url TEXT,
  their_url TEXT,
  your_keywords JSONB,
  their_keywords JSONB,
  gaps JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_gap_keywords_report_id ON public.gap_keywords(report_id);
CREATE INDEX idx_gap_pages_report_id ON public.gap_pages(report_id);
CREATE INDEX idx_domain_gap_reports_lookup ON public.domain_gap_reports(my_domain, competitor_domain, market, created_at DESC);
CREATE INDEX idx_domain_gap_reports_user_id ON public.domain_gap_reports(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.domain_gap_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gap_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gap_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domain_gap_reports
CREATE POLICY "Users can view their own reports"
  ON public.domain_gap_reports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON public.domain_gap_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON public.domain_gap_reports
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON public.domain_gap_reports
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports"
  ON public.domain_gap_reports
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all reports"
  ON public.domain_gap_reports
  FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for gap_keywords
CREATE POLICY "Users can view keywords for their reports"
  ON public.gap_keywords
  FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM public.domain_gap_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert keywords for their reports"
  ON public.gap_keywords
  FOR INSERT
  WITH CHECK (
    report_id IN (
      SELECT id FROM public.domain_gap_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update keywords for their reports"
  ON public.gap_keywords
  FOR UPDATE
  USING (
    report_id IN (
      SELECT id FROM public.domain_gap_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keywords for their reports"
  ON public.gap_keywords
  FOR DELETE
  USING (
    report_id IN (
      SELECT id FROM public.domain_gap_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all keywords"
  ON public.gap_keywords
  FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for gap_pages
CREATE POLICY "Users can view pages for their reports"
  ON public.gap_pages
  FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM public.domain_gap_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pages for their reports"
  ON public.gap_pages
  FOR INSERT
  WITH CHECK (
    report_id IN (
      SELECT id FROM public.domain_gap_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pages for their reports"
  ON public.gap_pages
  FOR UPDATE
  USING (
    report_id IN (
      SELECT id FROM public.domain_gap_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pages for their reports"
  ON public.gap_pages
  FOR DELETE
  USING (
    report_id IN (
      SELECT id FROM public.domain_gap_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all pages"
  ON public.gap_pages
  FOR ALL
  USING (is_admin(auth.uid()));

-- Add trigger for updated_at on domain_gap_reports
CREATE TRIGGER update_domain_gap_reports_updated_at
  BEFORE UPDATE ON public.domain_gap_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();