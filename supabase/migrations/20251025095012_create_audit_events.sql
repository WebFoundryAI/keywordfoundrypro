-- Create table for audit trail
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.keyword_research(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient queries
CREATE INDEX idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX idx_audit_events_project_id ON public.audit_events(project_id);
CREATE INDEX idx_audit_events_action ON public.audit_events(action);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit events
CREATE POLICY "Users can view own audit events"
  ON public.audit_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert audit events
CREATE POLICY "System can insert audit events"
  ON public.audit_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all audit events
CREATE POLICY "Admins can view all audit events"
  ON public.audit_events
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Policy: Admins can manage all audit events
CREATE POLICY "Admins can manage all audit events"
  ON public.audit_events
  FOR ALL
  USING (is_admin(auth.uid()));

COMMENT ON TABLE public.audit_events IS 'Records all significant user actions for compliance and troubleshooting';
COMMENT ON COLUMN public.audit_events.action IS 'Action type: query_executed, export_created, snapshot_saved, limit_reached, etc.';
COMMENT ON COLUMN public.audit_events.meta IS 'Context data: endpoint, row_count, filters hash, etc.';

-- Function to record audit event (helper for Edge Functions)
CREATE OR REPLACE FUNCTION record_audit_event(
  p_user_id UUID,
  p_project_id UUID,
  p_action TEXT,
  p_meta JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.audit_events (user_id, project_id, action, meta)
  VALUES (p_user_id, p_project_id, p_action, p_meta)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION record_audit_event IS 'Helper function to insert audit events from Edge Functions';
