-- Function to increment query count (atomic)
CREATE OR REPLACE FUNCTION increment_query_count(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_limits
  SET queries_today = queries_today + 1
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Create entry if it doesn't exist
    INSERT INTO user_limits (user_id, queries_today, last_query_reset)
    VALUES (p_user_id, 1, NOW());
  END IF;
END;
$$;

-- Function to increment credit usage (atomic)
CREATE OR REPLACE FUNCTION increment_credit_usage(p_user_id UUID, p_credits INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_limits
  SET credits_used_this_month = credits_used_this_month + p_credits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Create entry if it doesn't exist
    INSERT INTO user_limits (user_id, credits_used_this_month, credits_reset_at)
    VALUES (p_user_id, p_credits, DATE_TRUNC('month', NOW()) + INTERVAL '1 month');
  END IF;
END;
$$;

COMMENT ON FUNCTION increment_query_count IS 'Atomically increments user query count';
COMMENT ON FUNCTION increment_credit_usage IS 'Atomically increments user credit usage';
