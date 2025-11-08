-- Function to preview which non-admin users will be deleted
CREATE OR REPLACE FUNCTION preview_non_admin_users_for_deletion()
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  keyword_research_count bigint,
  competitor_analysis_count bigint,
  cluster_count bigint,
  export_count bigint,
  snapshot_count bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can preview user deletions';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.display_name,
    COALESCE((SELECT COUNT(*) FROM keyword_research kr WHERE kr.user_id = p.user_id), 0)::bigint as keyword_research_count,
    COALESCE((SELECT COUNT(*) FROM competitor_analysis ca WHERE ca.user_id = p.user_id), 0)::bigint as competitor_analysis_count,
    COALESCE((SELECT COUNT(*) FROM clusters c WHERE c.user_id = p.user_id), 0)::bigint as cluster_count,
    COALESCE((SELECT COUNT(*) FROM exports e WHERE e.user_id = p.user_id), 0)::bigint as export_count,
    COALESCE((SELECT COUNT(*) FROM project_snapshots ps WHERE ps.user_id = p.user_id), 0)::bigint as snapshot_count,
    p.created_at
  FROM profiles p
  WHERE p.user_id NOT IN (
    SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  )
  AND p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
END;
$$;

COMMENT ON FUNCTION preview_non_admin_users_for_deletion() IS 'Preview which non-admin users will be deleted with their data counts. Admin only.';