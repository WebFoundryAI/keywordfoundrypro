-- Add DELETE RLS policy for profiles table
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO public
USING (is_admin(auth.uid()));

-- Create secure function to delete user and all related data
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete in order (child tables first to avoid foreign key violations)
  DELETE FROM keyword_results WHERE research_id IN (
    SELECT id FROM keyword_research WHERE user_id = target_user_id
  );
  DELETE FROM keyword_research WHERE user_id = target_user_id;
  DELETE FROM user_usage WHERE user_id = target_user_id;
  DELETE FROM user_roles WHERE user_id = target_user_id;
  DELETE FROM user_subscriptions WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE user_id = target_user_id;

  RETURN true;
END;
$$;