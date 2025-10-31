-- Create missing database functions for production

-- Function 1: Increment query count
CREATE OR REPLACE FUNCTION increment_query_count(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO user_limits (user_id, queries_today, last_query_reset)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    queries_today = user_limits.queries_today + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Increment credit usage  
CREATE OR REPLACE FUNCTION increment_credit_usage(p_user_id uuid, p_credits integer)
RETURNS void AS $$
BEGIN
  INSERT INTO user_limits (user_id, credits_used_this_month, credits_reset_at)
  VALUES (p_user_id, p_credits, date_trunc('month', now() + interval '1 month'))
  ON CONFLICT (user_id)
  DO UPDATE SET 
    credits_used_this_month = user_limits.credits_used_this_month + p_credits,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get error rates by endpoint (mock until system_logs exists)
CREATE OR REPLACE FUNCTION get_error_rates_by_endpoint(since_timestamp timestamptz)
RETURNS TABLE(endpoint text, total_requests bigint, error_requests bigint, error_rate numeric) AS $$
BEGIN
  RETURN QUERY SELECT 
    'No data available'::text as endpoint,
    0::bigint as total_requests,
    0::bigint as error_requests,
    0::numeric as error_rate
  WHERE false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at column to project_comments if it doesn't exist
ALTER TABLE project_comments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to auto-update updated_at on project_comments
CREATE OR REPLACE FUNCTION update_project_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_comments_updated_at ON project_comments;
CREATE TRIGGER set_project_comments_updated_at
  BEFORE UPDATE ON project_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_comments_updated_at();