-- Create table to track sent usage notifications
CREATE TABLE IF NOT EXISTS public.usage_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'keywords_80', 'serp_80', 'related_80', 'trial_ending'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_usage_notifications_user_period ON public.usage_notifications(user_id, period_start, notification_type);

-- Enable RLS
ALTER TABLE public.usage_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.usage_notifications
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Service can insert notifications
CREATE POLICY "Service can insert notifications"
  ON public.usage_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);