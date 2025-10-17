-- Create ai_reports table for storing OpenAI-generated competitor analysis reports
CREATE TABLE public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  competitor TEXT NOT NULL,
  report_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

-- Policies for ai_reports
CREATE POLICY "Users can view their own AI reports"
  ON public.ai_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI reports"
  ON public.ai_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI reports"
  ON public.ai_reports FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all AI reports"
  ON public.ai_reports FOR ALL
  USING (is_admin(auth.uid()));

-- Create index for better query performance
CREATE INDEX idx_ai_reports_user_id ON public.ai_reports(user_id);
CREATE INDEX idx_ai_reports_competitor ON public.ai_reports(competitor);
CREATE INDEX idx_ai_reports_created_at ON public.ai_reports(created_at DESC);