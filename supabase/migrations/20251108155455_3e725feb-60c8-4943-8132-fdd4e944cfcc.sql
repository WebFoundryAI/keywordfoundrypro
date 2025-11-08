-- Fix ambiguous column reference in delete_all_non_admin_users function
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
      SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
    )
    AND p.deleted_at IS NULL
  LOOP
    BEGIN
      -- Delete keyword results (child table first)
      DELETE FROM keyword_results 
      WHERE research_id IN (
        SELECT kr.id FROM keyword_research kr WHERE kr.user_id = target_user.user_id
      );

      -- Delete keyword clusters
      DELETE FROM keyword_clusters 
      WHERE research_id IN (
        SELECT kr.id FROM keyword_research kr WHERE kr.user_id = target_user.user_id
      );

      -- Delete keyword research
      DELETE FROM keyword_research WHERE keyword_research.user_id = target_user.user_id;

      -- Delete competitor analysis
      DELETE FROM competitor_analysis WHERE competitor_analysis.user_id = target_user.user_id;

      -- Delete competitor cache
      DELETE FROM competitor_cache WHERE competitor_cache.user_id = target_user.user_id;

      -- Delete AI reports
      DELETE FROM ai_reports WHERE ai_reports.user_id = target_user.user_id;

      -- Delete domain gap reports and related data
      DELETE FROM gap_keywords 
      WHERE report_id IN (
        SELECT dgr.id FROM domain_gap_reports dgr WHERE dgr.user_id = target_user.user_id
      );
      
      DELETE FROM gap_pages 
      WHERE report_id IN (
        SELECT dgr.id FROM domain_gap_reports dgr WHERE dgr.user_id = target_user.user_id
      );
      
      DELETE FROM domain_gap_reports WHERE domain_gap_reports.user_id = target_user.user_id;

      -- Delete clusters
      DELETE FROM clusters WHERE clusters.user_id = target_user.user_id;

      -- Delete exports
      DELETE FROM exports WHERE exports.user_id = target_user.user_id;

      -- Delete project snapshots
      DELETE FROM project_snapshots WHERE project_snapshots.user_id = target_user.user_id;

      -- Delete project comments
      DELETE FROM project_comments WHERE project_comments.created_by = target_user.user_id;

      -- Delete project shares
      DELETE FROM project_shares 
      WHERE project_shares.shared_by_user_id = target_user.user_id 
        OR project_shares.shared_with_user_id = target_user.user_id;

      -- Delete research spaces
      DELETE FROM research_spaces WHERE research_spaces.owner_id = target_user.user_id;

      -- Delete audit events
      DELETE FROM audit_events WHERE audit_events.user_id = target_user.user_id;

      -- Delete user usage
      DELETE FROM user_usage WHERE user_usage.user_id = target_user.user_id;

      -- Delete user limits
      DELETE FROM user_limits WHERE user_limits.user_id = target_user.user_id;

      -- Delete user subscriptions
      DELETE FROM user_subscriptions WHERE user_subscriptions.user_id = target_user.user_id;

      -- Delete user roles (if any non-admin roles exist)
      DELETE FROM user_roles WHERE user_roles.user_id = target_user.user_id AND role != 'admin';

      -- Delete profile
      DELETE FROM profiles WHERE profiles.user_id = target_user.user_id;

      RETURN QUERY SELECT target_user.user_id, target_user.email, 'deleted'::text;

    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT target_user.user_id, target_user.email, ('error: ' || SQLERRM)::text;
    END;
  END LOOP;

  RETURN;
END;
$$;