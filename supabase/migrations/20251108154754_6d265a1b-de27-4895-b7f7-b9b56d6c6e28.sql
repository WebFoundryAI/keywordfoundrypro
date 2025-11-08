-- Function to purge all soft-deleted entries across tables
CREATE OR REPLACE FUNCTION purge_soft_deleted_entries()
RETURNS TABLE(table_name text, rows_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Purge keyword_research
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM keyword_research WHERE deleted_at IS NOT NULL RETURNING 1
  )
  SELECT 'keyword_research'::text, COUNT(*)::bigint FROM deleted;

  -- Purge project_snapshots
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM project_snapshots WHERE deleted_at IS NOT NULL RETURNING 1
  )
  SELECT 'project_snapshots'::text, COUNT(*)::bigint FROM deleted;

  -- Purge exports
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM exports WHERE deleted_at IS NOT NULL RETURNING 1
  )
  SELECT 'exports'::text, COUNT(*)::bigint FROM deleted;

  -- Purge clusters
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM clusters WHERE deleted_at IS NOT NULL RETURNING 1
  )
  SELECT 'clusters'::text, COUNT(*)::bigint FROM deleted;

  -- Purge cached_results
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM cached_results WHERE deleted_at IS NOT NULL RETURNING 1
  )
  SELECT 'cached_results'::text, COUNT(*)::bigint FROM deleted;

  -- Purge profiles (anonymized users)
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM profiles WHERE deleted_at IS NOT NULL RETURNING 1
  )
  SELECT 'profiles'::text, COUNT(*)::bigint FROM deleted;
END;
$$;

-- Function to delete all non-admin users and their data
CREATE OR REPLACE FUNCTION delete_all_non_admin_users()
RETURNS TABLE(user_id uuid, email text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user RECORD;
  admin_count int;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete all non-admin users';
  END IF;

  -- Count admins to prevent accidental deletion of all users
  SELECT COUNT(*) INTO admin_count
  FROM user_roles
  WHERE role = 'admin';

  IF admin_count = 0 THEN
    RAISE EXCEPTION 'No admin users found. Aborting to prevent total data loss.';
  END IF;

  -- Loop through all non-admin users
  FOR target_user IN
    SELECT DISTINCT p.user_id, p.email
    FROM profiles p
    WHERE p.user_id NOT IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
    AND p.deleted_at IS NULL
  LOOP
    BEGIN
      -- Delete keyword results (child table first)
      DELETE FROM keyword_results WHERE research_id IN (
        SELECT id FROM keyword_research WHERE user_id = target_user.user_id
      );

      -- Delete keyword research
      DELETE FROM keyword_research WHERE user_id = target_user.user_id;

      -- Delete keyword clusters
      DELETE FROM keyword_clusters WHERE research_id IN (
        SELECT id FROM keyword_research WHERE user_id = target_user.user_id
      );

      -- Delete competitor analysis
      DELETE FROM competitor_analysis WHERE user_id = target_user.user_id;

      -- Delete competitor cache
      DELETE FROM competitor_cache WHERE user_id = target_user.user_id;

      -- Delete AI reports
      DELETE FROM ai_reports WHERE user_id = target_user.user_id;

      -- Delete domain gap reports and related data
      DELETE FROM gap_keywords WHERE report_id IN (
        SELECT id FROM domain_gap_reports WHERE user_id = target_user.user_id
      );
      DELETE FROM gap_pages WHERE report_id IN (
        SELECT id FROM domain_gap_reports WHERE user_id = target_user.user_id
      );
      DELETE FROM domain_gap_reports WHERE user_id = target_user.user_id;

      -- Delete clusters
      DELETE FROM clusters WHERE user_id = target_user.user_id;

      -- Delete exports
      DELETE FROM exports WHERE user_id = target_user.user_id;

      -- Delete project snapshots
      DELETE FROM project_snapshots WHERE user_id = target_user.user_id;

      -- Delete project comments
      DELETE FROM project_comments WHERE created_by = target_user.user_id;

      -- Delete project shares
      DELETE FROM project_shares WHERE shared_by_user_id = target_user.user_id 
        OR shared_with_user_id = target_user.user_id;

      -- Delete research spaces
      DELETE FROM research_spaces WHERE owner_id = target_user.user_id;

      -- Delete audit events
      DELETE FROM audit_events WHERE user_id = target_user.user_id;

      -- Delete user usage
      DELETE FROM user_usage WHERE user_id = target_user.user_id;

      -- Delete user limits
      DELETE FROM user_limits WHERE user_id = target_user.user_id;

      -- Delete user subscriptions
      DELETE FROM user_subscriptions WHERE user_id = target_user.user_id;

      -- Delete user roles (if any non-admin roles exist)
      DELETE FROM user_roles WHERE user_id = target_user.user_id AND role != 'admin';

      -- Delete profile
      DELETE FROM profiles WHERE user_id = target_user.user_id;

      -- Delete from auth.users (requires service role, will be handled by trigger if exists)
      -- Note: This requires admin privileges and may need to be done separately via Supabase API

      RETURN QUERY SELECT target_user.user_id, target_user.email, 'deleted'::text;

    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT target_user.user_id, target_user.email, 'error: ' || SQLERRM;
    END;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION delete_all_non_admin_users() IS 'Deletes all non-admin users and their associated data. Only callable by admins. Preserves at least one admin user.';
COMMENT ON FUNCTION purge_soft_deleted_entries() IS 'Permanently deletes all soft-deleted entries from tables with deleted_at column.';