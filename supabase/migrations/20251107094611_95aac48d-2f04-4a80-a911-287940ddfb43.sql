-- Create a function to check critical triggers exist
CREATE OR REPLACE FUNCTION public.check_critical_triggers()
RETURNS TABLE(
  trigger_name text,
  table_schema text,
  table_name text,
  trigger_exists boolean,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH expected_triggers AS (
    SELECT 
      'on_auth_user_created'::text as trig_name,
      'auth'::text as trig_schema,
      'users'::text as trig_table
    UNION ALL
    SELECT 
      'on_profile_created_create_trial'::text,
      'public'::text,
      'profiles'::text
  )
  SELECT 
    et.trig_name::text,
    et.trig_schema::text,
    et.trig_table::text,
    EXISTS (
      SELECT 1 
      FROM information_schema.triggers t
      WHERE t.trigger_name = et.trig_name
        AND t.event_object_schema = et.trig_schema
        AND t.event_object_table = et.trig_table
    ) as trigger_exists,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM information_schema.triggers t
        WHERE t.trigger_name = et.trig_name
          AND t.event_object_schema = et.trig_schema
          AND t.event_object_table = et.trig_table
      ) THEN 'OK'
      ELSE 'MISSING'
    END::text as status
  FROM expected_triggers et;
END;
$$;

-- Create a table to log trigger check results
CREATE TABLE IF NOT EXISTS public.trigger_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  trigger_name text NOT NULL,
  table_schema text NOT NULL,
  table_name text NOT NULL,
  status text NOT NULL,
  checked_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on trigger_health_logs
ALTER TABLE public.trigger_health_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view trigger health logs"
ON public.trigger_health_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Policy: Service can insert logs
CREATE POLICY "Service can insert trigger health logs"
ON public.trigger_health_logs
FOR INSERT
WITH CHECK (true);