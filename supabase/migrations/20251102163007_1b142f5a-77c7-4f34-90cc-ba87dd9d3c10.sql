-- Fix CRITICAL security issue: Add SET search_path to all SECURITY DEFINER functions
-- This prevents SQL injection and privilege escalation attacks

-- 1. Fix delete_old_system_logs
CREATE OR REPLACE FUNCTION delete_old_system_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM system_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 2. Fix refresh_analytics_funnel_view
CREATE OR REPLACE FUNCTION refresh_analytics_funnel_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.analytics_funnel_view;
END;
$$;

-- 3. Fix create_user_email_mapping
CREATE OR REPLACE FUNCTION create_user_email_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_emails (user_id, email, verified)
  VALUES (NEW.user_id, (SELECT email FROM auth.users WHERE id = NEW.user_id), true)
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Fix update_feedback_triage
CREATE OR REPLACE FUNCTION update_feedback_triage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status != 'new' AND OLD.triaged_at IS NULL THEN
    NEW.triaged_at = now();
    NEW.triaged_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Fix create_default_rank_settings
CREATE OR REPLACE FUNCTION create_default_rank_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.rank_settings (project_id, enabled, daily_quota)
  VALUES (NEW.id, false, 25)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6. Fix update_api_key_last_used
CREATE OR REPLACE FUNCTION update_api_key_last_used(key_hash_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = key_hash_param
  AND revoked_at IS NULL;
END;
$$;

-- 7. Fix add_project_creator_as_owner
CREATE OR REPLACE FUNCTION public.add_project_creator_as_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role, added_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id);
  RETURN NEW;
END;
$$;

-- 8. Fix is_project_member
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID, p_min_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
    AND user_id = p_user_id
    AND (
      CASE p_min_role
        WHEN 'viewer' THEN role IN ('viewer', 'commenter', 'editor', 'owner')
        WHEN 'commenter' THEN role IN ('commenter', 'editor', 'owner')
        WHEN 'editor' THEN role IN ('editor', 'owner')
        WHEN 'owner' THEN role = 'owner'
        ELSE false
      END
    )
  );
END;
$$;

-- 9. Fix increment_query_count
CREATE OR REPLACE FUNCTION increment_query_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_limits (user_id, queries_today, last_query_reset)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    queries_today = user_limits.queries_today + 1,
    updated_at = now();
END;
$$;

-- 10. Fix increment_credit_usage
CREATE OR REPLACE FUNCTION increment_credit_usage(p_user_id uuid, p_credits integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_limits (user_id, credits_used_this_month, credits_reset_at)
  VALUES (p_user_id, p_credits, date_trunc('month', now() + interval '1 month'))
  ON CONFLICT (user_id)
  DO UPDATE SET 
    credits_used_this_month = user_limits.credits_used_this_month + p_credits,
    updated_at = now();
END;
$$;

-- 11. Fix get_error_rates_by_endpoint
CREATE OR REPLACE FUNCTION get_error_rates_by_endpoint(since_timestamp timestamptz)
RETURNS TABLE(endpoint text, total_requests bigint, error_requests bigint, error_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT 
    'No data available'::text as endpoint,
    0::bigint as total_requests,
    0::bigint as error_requests,
    0::numeric as error_rate
  WHERE false;
END;
$$;

COMMENT ON FUNCTION delete_old_system_logs IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION refresh_analytics_funnel_view IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION create_user_email_mapping IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION update_feedback_triage IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION create_default_rank_settings IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION update_api_key_last_used IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION public.add_project_creator_as_owner IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION public.is_project_member IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION increment_query_count IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION increment_credit_usage IS 'SECURITY: Fixed search_path to prevent SQL injection';
COMMENT ON FUNCTION get_error_rates_by_endpoint IS 'SECURITY: Fixed search_path to prevent SQL injection';