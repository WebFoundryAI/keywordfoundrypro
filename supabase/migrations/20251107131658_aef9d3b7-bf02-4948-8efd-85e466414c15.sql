-- Create function to get users near their usage limits (80% or more)
CREATE OR REPLACE FUNCTION public.get_users_near_limits()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  tier TEXT,
  usage_type TEXT,
  used INTEGER,
  usage_limit INTEGER,
  percentage NUMERIC,
  period_end TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    SELECT 
      uu.user_id,
      p.email,
      p.display_name,
      us.tier::TEXT,
      uu.keywords_used,
      uu.serp_analyses_used,
      uu.related_keywords_used,
      uu.period_end,
      sp.keywords_per_month,
      sp.serp_analyses_per_month,
      sp.related_keywords_per_month
    FROM user_usage uu
    JOIN profiles p ON p.user_id = uu.user_id
    JOIN user_subscriptions us ON us.user_id = uu.user_id
    JOIN subscription_plans sp ON sp.tier = us.tier
    WHERE 
      us.status = 'active'
      AND uu.period_end > now()
      AND NOT is_admin(uu.user_id)
  )
  -- Check keywords usage
  SELECT 
    ud.user_id,
    ud.email,
    ud.display_name,
    ud.tier,
    'keywords'::TEXT as usage_type,
    ud.keywords_used as used,
    ud.keywords_per_month as usage_limit,
    ROUND((ud.keywords_used::NUMERIC / NULLIF(ud.keywords_per_month, 0)) * 100, 2) as percentage,
    ud.period_end::TEXT
  FROM user_data ud
  WHERE 
    ud.keywords_per_month > 0 
    AND ud.keywords_per_month != -1
    AND (ud.keywords_used::NUMERIC / ud.keywords_per_month) >= 0.8
  
  UNION ALL
  
  -- Check SERP analyses usage
  SELECT 
    ud.user_id,
    ud.email,
    ud.display_name,
    ud.tier,
    'serp'::TEXT as usage_type,
    ud.serp_analyses_used as used,
    ud.serp_analyses_per_month as usage_limit,
    ROUND((ud.serp_analyses_used::NUMERIC / NULLIF(ud.serp_analyses_per_month, 0)) * 100, 2) as percentage,
    ud.period_end::TEXT
  FROM user_data ud
  WHERE 
    ud.serp_analyses_per_month > 0
    AND ud.serp_analyses_per_month != -1
    AND (ud.serp_analyses_used::NUMERIC / ud.serp_analyses_per_month) >= 0.8
  
  UNION ALL
  
  -- Check related keywords usage
  SELECT 
    ud.user_id,
    ud.email,
    ud.display_name,
    ud.tier,
    'related'::TEXT as usage_type,
    ud.related_keywords_used as used,
    ud.related_keywords_per_month as usage_limit,
    ROUND((ud.related_keywords_used::NUMERIC / NULLIF(ud.related_keywords_per_month, 0)) * 100, 2) as percentage,
    ud.period_end::TEXT
  FROM user_data ud
  WHERE 
    ud.related_keywords_per_month > 0
    AND ud.related_keywords_per_month != -1
    AND (ud.related_keywords_used::NUMERIC / ud.related_keywords_per_month) >= 0.8;
END;
$$;