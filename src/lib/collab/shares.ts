import { supabase } from '@/integrations/supabase/client';

export interface ProjectShare {
  id: string;
  project_id: string;
  shared_with_email: string;
  permission: 'viewer' | 'commenter';
  shared_by_user_id: string;
  shared_with_user_id: string;
  created_at: string;
}

export interface CreateShareInput {
  project_id: string;
  shared_with_email: string;
  permission: 'viewer' | 'commenter';
  shared_with_user_id: string;
}

/**
 * Create a project share invitation
 */
export async function createProjectShare(
  input: CreateShareInput
): Promise<{ data: ProjectShare | null; error: string | null }> {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.shared_with_email)) {
    return { data: null, error: 'Invalid email address' };
  }

  // Create the share
  const { data, error } = await supabase
    .from('project_shares')
    .insert({
      project_id: input.project_id,
      shared_with_email: input.shared_with_email.toLowerCase(),
      permission: input.permission,
      shared_by_user_id: user.id,
      shared_with_user_id: input.shared_with_user_id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return { data: null, error: 'This email is already shared on this project' };
    }
    return { data: null, error: error.message };
  }

  return { data: data as ProjectShare, error: null };
}

/**
 * List shares for a project
 */
export async function listProjectShares(
  projectId: string
): Promise<ProjectShare[]> {

  const { data, error } = await supabase
    .from('project_shares')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing project shares:', error);
    return [];
  }

  return (data || []) as ProjectShare[];
}

/**
 * Delete a project share
 */
export async function deleteProjectShare(
  shareId: string
): Promise<{ success: boolean; error: string | null }> {

  const { error } = await supabase
    .from('project_shares')
    .delete()
    .eq('id', shareId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get user's role for a project (owner, commenter, viewer, or null)
 */
export async function getUserProjectRole(
  projectId: string
): Promise<'owner' | 'commenter' | 'viewer' | null> {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if shared
  const { data: share } = await supabase
    .from('project_shares')
    .select('permission')
    .eq('project_id', projectId)
    .eq('shared_with_user_id', user.id)
    .maybeSingle();

  return (share?.permission as 'commenter' | 'viewer') || null;
}

/**
 * List projects shared with current user
 */
export async function listSharedProjects(): Promise<any[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('project_shares')
    .select('project_id, permission')
    .eq('shared_with_user_id', user.id);

  if (error) {
    console.error('Error listing shared projects:', error);
    return [];
  }

  return data || [];
}
