-- Force insert user_usage record for admin user
INSERT INTO public.user_usage (
  user_id, 
  period_start, 
  period_end, 
  keywords_used, 
  serp_analyses_used, 
  related_keywords_used
)
VALUES (
  '617b8fd1-17a7-4073-aae3-48a16e460ea0'::uuid,
  '2025-10-12 15:23:30.718+00'::timestamptz,
  '2025-10-12 15:23:30.718+00'::timestamptz,
  0,
  0,
  0
)
ON CONFLICT (user_id, period_start) DO UPDATE SET
  keywords_used = 0,
  serp_analyses_used = 0,
  related_keywords_used = 0,
  updated_at = now();