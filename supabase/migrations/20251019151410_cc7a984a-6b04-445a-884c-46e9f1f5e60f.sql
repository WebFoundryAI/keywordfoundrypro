-- Create competitor_analysis table for caching analysis results
CREATE TABLE public.competitor_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  your_domain TEXT NOT NULL,
  competitor_domain TEXT NOT NULL,
  keyword_gap_list JSONB,
  backlink_summary JSONB,
  onpage_summary JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_competitor_analysis_domains ON public.competitor_analysis(user_id, your_domain, competitor_domain);
CREATE INDEX idx_competitor_analysis_expires ON public.competitor_analysis(expires_at);

-- Enable RLS
ALTER TABLE public.competitor_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analyses"
ON public.competitor_analysis
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
ON public.competitor_analysis
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
ON public.competitor_analysis
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
ON public.competitor_analysis
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analyses"
ON public.competitor_analysis
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all analyses"
ON public.competitor_analysis
FOR ALL
USING (is_admin(auth.uid()));