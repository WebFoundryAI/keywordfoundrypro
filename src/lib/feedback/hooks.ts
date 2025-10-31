/**
 * FEATURE DISABLED: Feedback table does not exist in database
 * These functions return empty data and log warnings
 */

export interface Feedback {
  id: string;
  kind: 'bug' | 'feature' | 'other';
  title: string;
  body: string;
  score?: number;
  user_id: string;
  created_at: string;
}

export async function submitFeedback(
  kind: 'bug' | 'feature' | 'other',
  title: string,
  body: string,
  score?: number
): Promise<{ success: boolean; error?: string }> {
  console.warn('Feedback feature is disabled - feedback table does not exist');
  return { success: false, error: 'Feature not available' };
}

export async function listFeedback(): Promise<Feedback[]> {
  console.warn('Feedback feature is disabled - feedback table does not exist');
  return [];
}

export async function deleteFeedback(
  feedbackId: string
): Promise<{ success: boolean; error?: string }> {
  console.warn('Feedback feature is disabled - feedback table does not exist');
  return { success: false, error: 'Feature not available' };
}

export function shouldShowNPS(): boolean {
  return false;
}

export function markNPSShown(): void {
  // No-op
}
