import { createClient } from '@/lib/supabase/client';

export interface Comment {
  id: string;
  project_id: string;
  subject_type: 'keyword' | 'cluster';
  subject_id: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: {
    email: string;
    full_name?: string;
  };
}

export interface CreateCommentInput {
  project_id: string;
  subject_type: 'keyword' | 'cluster';
  subject_id: string;
  body: string;
}

/**
 * Create a comment on a keyword or cluster
 */
export async function createComment(
  input: CreateCommentInput
): Promise<{ data: Comment | null; error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  if (!input.body.trim()) {
    return { data: null, error: 'Comment body cannot be empty' };
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      project_id: input.project_id,
      subject_type: input.subject_type,
      subject_id: input.subject_id,
      body: input.body.trim(),
      author_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * List comments for a subject (keyword or cluster)
 */
export async function listComments(
  projectId: string,
  subjectType: 'keyword' | 'cluster',
  subjectId: string
): Promise<Comment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('project_id', projectId)
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error listing comments:', error);
    return [];
  }

  // Fetch author details
  const commentsWithAuthors = await Promise.all(
    (data || []).map(async (comment) => {
      const { data: userData } = await supabase.auth.admin.getUserById(
        comment.author_id
      );

      return {
        ...comment,
        author: userData?.user
          ? {
              email: userData.user.email || 'Unknown',
              full_name: userData.user.user_metadata?.full_name,
            }
          : { email: 'Unknown' },
      };
    })
  );

  return commentsWithAuthors;
}

/**
 * Update a comment (edit body)
 */
export async function updateComment(
  commentId: string,
  body: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  if (!body.trim()) {
    return { success: false, error: 'Comment body cannot be empty' };
  }

  const { error } = await supabase
    .from('comments')
    .update({ body: body.trim() })
    .eq('id', commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get comment count for a subject
 */
export async function getCommentCount(
  projectId: string,
  subjectType: 'keyword' | 'cluster',
  subjectId: string
): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId);

  if (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get all comment counts for a project (by subject)
 */
export async function getAllCommentCounts(
  projectId: string
): Promise<Record<string, number>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('comments')
    .select('subject_type, subject_id')
    .eq('project_id', projectId);

  if (error) {
    console.error('Error getting comment counts:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  (data || []).forEach((comment) => {
    const key = `${comment.subject_type}:${comment.subject_id}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}
