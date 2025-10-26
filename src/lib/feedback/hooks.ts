import { createClient } from '@/lib/supabase/client';

export interface Feedback {
  id: string;
  user_id: string | null;
  kind: 'nps' | 'feature';
  score: number | null;
  title: string | null;
  body: string | null;
  metadata: any;
  status: 'new' | 'triaged' | 'in-progress' | 'done' | 'wont-fix';
  created_at: string;
}

export async function submitNPS(
  score: number,
  body?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (score < 0 || score > 10) {
    return { success: false, error: 'Score must be between 0 and 10' };
  }

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    kind: 'nps',
    score,
    body,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function submitFeatureRequest(
  title: string,
  body: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!title.trim() || !body.trim()) {
    return { success: false, error: 'Title and body are required' };
  }

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    kind: 'feature',
    title,
    body,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function listFeedback(): Promise<Feedback[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing feedback:', error);
    return [];
  }

  return data || [];
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: Feedback['status']
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('feedback')
    .update({ status })
    .eq('id', feedbackId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Check if user should see NPS prompt
export function shouldShowNPS(): boolean {
  const lastShown = localStorage.getItem('nps_last_shown');
  if (!lastShown) return false;

  const daysSinceShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
  return daysSinceShown > 30; // Show every 30 days
}

export function markNPSShown(): void {
  localStorage.setItem('nps_last_shown', Date.now().toString());
}
