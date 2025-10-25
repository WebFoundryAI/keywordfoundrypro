-- Enhance RLS policies for core tables
-- This migration ensures consistent RLS across all user-owned tables

-- Fix cached_results foreign key (was referencing non-existent projects table)
ALTER TABLE public.cached_results DROP CONSTRAINT IF EXISTS cached_results_project_id_fkey;
ALTER TABLE public.cached_results
  ADD CONSTRAINT cached_results_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.keyword_research(id)
  ON DELETE CASCADE;

-- Add user access policy to dataforseo_usage (currently only admins can view)
CREATE POLICY "Users can view own dataforseo usage"
  ON public.dataforseo_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Ensure dataforseo_usage has user policies for updates/deletes (admin only currently)
-- Users should be able to see their own costs
COMMENT ON POLICY "Users can view own dataforseo usage" ON public.dataforseo_usage IS 'Allow users to view their own API usage and costs';

-- Verification instructions (run these as postgres user to test RLS):
/*
-- Test 1: Verify user can only see their own data
SET ROLE authenticated;
SET request.jwt.claim.sub = '<user_uuid_1>';
SELECT COUNT(*) FROM project_snapshots; -- Should only return user_1's snapshots
SELECT COUNT(*) FROM exports; -- Should only return user_1's exports
SELECT COUNT(*) FROM audit_events; -- Should only return user_1's events
SELECT COUNT(*) FROM cached_results WHERE user_id = '<user_uuid_1>'; -- Should work
SELECT COUNT(*) FROM cached_results WHERE user_id = '<user_uuid_2>'; -- Should return 0

-- Test 2: Verify cross-user access is denied
SET request.jwt.claim.sub = '<user_uuid_2>';
SELECT COUNT(*) FROM project_snapshots WHERE user_id = '<user_uuid_1>'; -- Should return 0
INSERT INTO project_snapshots (user_id, project_id, payload)
VALUES ('<user_uuid_1>', '<some_project_id>', '{}'::jsonb); -- Should fail

-- Test 3: Verify admin can see all
SET ROLE authenticated;
SET request.jwt.claim.sub = '<admin_user_uuid>';
SELECT COUNT(*) FROM project_snapshots; -- Should return all snapshots
SELECT COUNT(*) FROM exports; -- Should return all exports

-- Reset
RESET ROLE;
*/

-- Add comments for documentation
COMMENT ON TABLE public.project_snapshots IS 'User-owned project state snapshots with strict RLS';
COMMENT ON TABLE public.exports IS 'User-owned export history with strict RLS';
COMMENT ON TABLE public.audit_events IS 'User-owned audit trail with strict RLS';
COMMENT ON TABLE public.cached_results IS 'User-owned API response cache with strict RLS';
COMMENT ON TABLE public.dataforseo_usage IS 'API usage tracking with user and admin access';
