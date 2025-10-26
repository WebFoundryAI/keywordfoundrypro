import { supabase } from '@/integrations/supabase/client';

const TOUR_STORAGE_KEY = 'kfp_has_seen_tour';

export interface TourState {
  hasSeenTour: boolean;
  lastSeenAt?: string;
}

/**
 * Check if user has seen the tour
 * Tries database first, falls back to localStorage
 */
export async function hasSeenTour(): Promise<boolean> {
  try {
    // Try to get from user profile
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_seen_tour')
        .eq('user_id', user.id)
        .single();

      if (profile && profile.has_seen_tour !== undefined) {
        return profile.has_seen_tour;
      }
    }
  } catch (error) {
    console.warn('Failed to check tour state from database:', error);
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(TOUR_STORAGE_KEY);
  return stored === 'true';
}

/**
 * Mark tour as seen
 * Persists to both database and localStorage
 */
export async function markTourAsSeen(): Promise<void> {
  const timestamp = new Date().toISOString();

  // Save to localStorage immediately
  localStorage.setItem(TOUR_STORAGE_KEY, 'true');

  try {
    // Try to save to user profile
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('profiles')
        .update({
          has_seen_tour: true,
          tour_seen_at: timestamp,
        })
        .eq('user_id', user.id);
    }
  } catch (error) {
    console.warn('Failed to save tour state to database:', error);
  }
}

/**
 * Reset tour state (for "Replay Tour" feature)
 * Only resets localStorage, not database
 */
export function resetTourState(): void {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}

/**
 * Get full tour state
 */
export async function getTourState(): Promise<TourState> {
  const seen = await hasSeenTour();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tour_seen_at')
        .eq('user_id', user.id)
        .single();

      return {
        hasSeenTour: seen,
        lastSeenAt: profile?.tour_seen_at,
      };
    }
  } catch (error) {
    console.warn('Failed to get tour state:', error);
  }

  return { hasSeenTour: seen };
}
