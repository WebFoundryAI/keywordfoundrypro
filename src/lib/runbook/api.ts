/**
 * FEATURE DISABLED: runbook_docs table does not exist in database
 * These functions return empty data and log warnings
 */

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

export async function getLatestRunbook(): Promise<RunbookDoc | null> {
  console.warn('Runbook feature is disabled - runbook_docs table does not exist');
  return null;
}

export async function getAllRunbookVersions(): Promise<RunbookDoc[]> {
  console.warn('Runbook feature is disabled - runbook_docs table does not exist');
  return [];
}

export async function getRunbookByVersion(
  version: number
): Promise<RunbookDoc | null> {
  console.warn('Runbook feature is disabled - runbook_docs table does not exist');
  return null;
}

export async function createRunbook(
  input: CreateRunbookInput,
  userId: string
): Promise<{ data: RunbookDoc | null; error: string | null }> {
  console.warn('Runbook feature is disabled - runbook_docs table does not exist');
  return { data: null, error: 'Feature not available' };
}

export async function updateRunbook(
  input: UpdateRunbookInput,
  userId: string
): Promise<{ data: RunbookDoc | null; error: string | null }> {
  console.warn('Runbook feature is disabled - runbook_docs table does not exist');
  return { data: null, error: 'Feature not available' };
}

export async function searchRunbook(query: string): Promise<RunbookDoc[]> {
  console.warn('Runbook feature is disabled - runbook_docs table does not exist');
  return [];
}

export async function getRunbookHistory(title: string): Promise<RunbookDoc[]> {
  console.warn('Runbook feature is disabled - runbook_docs table does not exist');
  return [];
}

export async function checkIsAdmin(): Promise<boolean> {
  console.warn('Runbook feature is disabled - runbook_docs table does not exist');
  return false;
}
