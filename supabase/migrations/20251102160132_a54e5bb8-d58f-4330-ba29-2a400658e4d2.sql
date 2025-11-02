-- Security fixes for database

-- 1. Restrict subscription_plans access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;

CREATE POLICY "Authenticated users can view active plans"
ON subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Add search_path to database functions to prevent schema hijacking

-- Fix get_error_rates_by_endpoint function
CREATE OR REPLACE FUNCTION public.get_error_rates_by_endpoint(since_timestamp timestamp with time zone)
RETURNS TABLE(endpoint text, total_requests bigint, error_requests bigint, error_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT 
    'No data available'::text as endpoint,
    0::bigint as total_requests,
    0::bigint as error_requests,
    0::numeric as error_rate
  WHERE false;
END;
$function$;

-- Fix update_project_comments_updated_at function
CREATE OR REPLACE FUNCTION public.update_project_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_project_snapshots_updated_at function
CREATE OR REPLACE FUNCTION public.update_project_snapshots_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function (already has search_path, recreating for consistency)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Fix project_comments RLS to check project ownership via keyword_research
DROP POLICY IF EXISTS "Users can view comments for their projects" ON project_comments;

CREATE POLICY "Users can view comments for their projects"
ON project_comments
FOR SELECT
USING (
  created_by = auth.uid() 
  OR project_id IN (
    SELECT id FROM keyword_research WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own comments"
ON project_comments
FOR UPDATE
USING (created_by = auth.uid());

-- Allow users to view comments on projects they own or are shared with
CREATE POLICY "Users can view shared project comments"
ON project_comments
FOR SELECT
USING (
  project_id IN (
    SELECT ps.project_id 
    FROM project_shares ps 
    WHERE ps.shared_with_user_id = auth.uid()
  )
);