import { createClient } from '@/lib/supabase/client';

export interface ProjectShare {
  id: string;
  project_id: string;
  invited_email: string;
  role: 'viewer' | 'commenter';
  invited_by: string;
  created_at: string;
}

export interface CreateShareInput {
  project_id: string;
  invited_email: string;
  role: 'viewer' | 'commenter';
}

/**
 * Create a project share invitation
 */
export async function createProjectShare(
  input: CreateShareInput
): Promise<{ data: ProjectShare | null; error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.invited_email)) {
    return { data: null, error: 'Invalid email address' };
  }

  // Check if user owns the project
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', input.project_id)
    .single();

  if (!project || project.user_id !== user.id) {
    return { data: null, error: 'Project not found or access denied' };
  }

  // Create the share
  const { data, error } = await supabase
    .from('project_shares')
    .insert({
      project_id: input.project_id,
      invited_email: input.invited_email.toLowerCase(),
      role: input.role,
      invited_by: user.id,
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

  return { data, error: null };
}

/**
 * List shares for a project
 */
export async function listProjectShares(
  projectId: string
): Promise<ProjectShare[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_shares')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing project shares:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete a project share
 */
export async function deleteProjectShare(
  shareId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

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
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if owner
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (project?.user_id === user.id) {
    return 'owner';
  }

  // Check if shared
  const { data: share } = await supabase
    .from('project_shares')
    .select('role')
    .eq('project_id', projectId)
    .eq('invited_email', user.email)
    .single();

  return share?.role || null;
}

/**
 * List projects shared with current user
 */
export async function listSharedProjects(): Promise<any[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('project_shares')
    .select('project_id, role, projects(*)')
    .eq('invited_email', user.email);

  if (error) {
    console.error('Error listing shared projects:', error);
    return [];
  }

  return data || [];
}
