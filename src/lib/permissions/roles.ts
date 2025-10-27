import { createClient } from '@supabase/supabase-js';

export type ProjectRole = 'viewer' | 'commenter' | 'editor' | 'owner';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  added_by: string;
  created_at: string;
}

/**
 * Get user's role in a project
 * Note: Uses project_members table as the single source of truth.
 * Project creators are automatically added as owners via database trigger.
 */
export async function getUserRole(
  projectId: string,
  userId: string
): Promise<ProjectRole | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check project_members table (single source of truth)
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (member) {
    return member.role as ProjectRole;
  }

  return null;
}

/**
 * Check if user can view project resources
 */
export async function canView(projectId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(projectId, userId);
  return role !== null;
}

/**
 * Check if user can comment on project resources
 */
export async function canComment(projectId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(projectId, userId);
  return role === 'commenter' || role === 'editor' || role === 'owner';
}

/**
 * Check if user can edit project resources
 */
export async function canEdit(projectId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(projectId, userId);
  return role === 'editor' || role === 'owner';
}

/**
 * Check if user is project owner
 */
export async function isOwner(projectId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(projectId, userId);
  return role === 'owner';
}

/**
 * Get all members of a project
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching project members:', error);
    return [];
  }

  return data || [];
}

/**
 * Add member to project
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole,
  addedBy: string
): Promise<{ success: boolean; error: string | null }> {
  // Verify addedBy is owner
  const isOwnerUser = await isOwner(projectId, addedBy);
  if (!isOwnerUser) {
    return { success: false, error: 'Only project owners can add members' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: userId,
      role,
      added_by: addedBy,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Update member role
 */
export async function updateMemberRole(
  projectId: string,
  userId: string,
  newRole: ProjectRole,
  updatedBy: string
): Promise<{ success: boolean; error: string | null }> {
  // Verify updatedBy is owner
  const isOwnerUser = await isOwner(projectId, updatedBy);
  if (!isOwnerUser) {
    return { success: false, error: 'Only project owners can update member roles' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('project_members')
    .update({ role: newRole })
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Remove member from project
 */
export async function removeMember(
  projectId: string,
  userId: string,
  removedBy: string
): Promise<{ success: boolean; error: string | null }> {
  // Verify removedBy is owner
  const isOwnerUser = await isOwner(projectId, removedBy);
  if (!isOwnerUser) {
    return { success: false, error: 'Only project owners can remove members' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if user being removed is an owner
  const userRole = await getUserRole(projectId, userId);
  if (userRole === 'owner') {
    // Count total owners
    const { data: owners, error: countError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('role', 'owner');

    if (countError) {
      return { success: false, error: countError.message };
    }

    // Prevent removing the last owner
    if (owners && owners.length <= 1) {
      return {
        success: false,
        error: 'Cannot remove the last owner. Transfer ownership first or add another owner.',
      };
    }
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
