import { supabase } from '@/integrations/supabase/client';

export interface RunbookDoc {
  id: string;
  title: string;
  body_md: string;
  version: number;
  edited_by: string | null;
  created_at: string;
}

export interface CreateRunbookInput {
  title: string;
  body_md: string;
}

export interface UpdateRunbookInput {
  title?: string;
  body_md?: string;
}

/**
 * Get the latest version of the runbook
 */
export async function getLatestRunbook(): Promise<RunbookDoc | null> {
  const { data, error} = await supabase
    .from('runbook_docs')
    .select('*')
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching latest runbook:', error);
    return null;
  }

  return data;
}

/**
 * Get all runbook versions
 */
export async function getAllRunbookVersions(): Promise<RunbookDoc[]> {
  const { data, error } = await supabase
    .from('runbook_docs')
    .select('*')
    .order('version', { ascending: false});

  if (error) {
    console.error('Error fetching runbook versions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific runbook version
 */
export async function getRunbookByVersion(
  version: number
): Promise<RunbookDoc | null> {
  const { data, error } = await supabase
    .from('runbook_docs')
    .select('*')
    .eq('version', version)
    .single();

  if (error) {
    console.error(`Error fetching runbook version ${version}:`, error);
    return null;
  }

  return data;
}

/**
 * Create a new runbook version
 * Automatically increments version number based on latest version
 */
export async function createRunbook(
  input: CreateRunbookInput,
  userId: string
): Promise<{ data: RunbookDoc | null; error: string | null }> {
  // Get latest version to increment
  const latest = await getLatestRunbook();
  const nextVersion = latest ? latest.version + 1 : 1;

  const { data, error } = await supabase
    .from('runbook_docs')
    .insert({
      title: input.title,
      body_md: input.body_md,
      version: nextVersion,
      edited_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating runbook:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Update the latest runbook (creates a new version)
 * This is an append-only system - updates create new versions
 */
export async function updateRunbook(
  input: UpdateRunbookInput,
  userId: string
): Promise<{ data: RunbookDoc | null; error: string | null }> {
  const latest = await getLatestRunbook();

  if (!latest) {
    return { data: null, error: 'No runbook exists to update' };
  }

  // Create new version with updated fields
  return createRunbook(
    {
      title: input.title || latest.title,
      body_md: input.body_md || latest.body_md,
    },
    userId
  );
}

/**
 * Search runbook content
 */
export async function searchRunbook(query: string): Promise<RunbookDoc[]> {
  if (!query.trim()) {
    return [];
  }

  const searchTerm = `%${query}%`;

  const { data, error } = await supabase
    .from('runbook_docs')
    .select('*')
    .or(`title.ilike.${searchTerm},body_md.ilike.${searchTerm}`)
    .order('version', { ascending: false });

  if (error) {
    console.error('Error searching runbook:', error);
    return [];
  }

  return data || [];
}

/**
 * Get runbook history for a specific title
 */
export async function getRunbookHistory(
  title: string
): Promise<RunbookDoc[]> {
  const { data, error } = await supabase
    .from('runbook_docs')
    .select('*')
    .eq('title', title)
    .order('version', { ascending: false });

  if (error) {
    console.error('Error fetching runbook history:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if user is admin (required for runbook access)
 */
export async function checkIsAdmin(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return false;

  return data.is_admin;
}
