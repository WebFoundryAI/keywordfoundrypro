import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY_PREFIX = 'kfp_onboarding_completed';

/**
 * Get the user-specific onboarding key for localStorage fallback
 * Falls back to non-user-specific key for backwards compatibility
 */
const getOnboardingKey = (userId?: string): string => {
  return userId ? `${ONBOARDING_KEY_PREFIX}_${userId}` : ONBOARDING_KEY_PREFIX;
};

export const onboardingStorage = {
  /**
   * Check if onboarding has been completed for a user
   * Uses Supabase profiles table if userId provided, otherwise localStorage
   */
  isCompleted: async (userId?: string): Promise<boolean> => {
    if (!userId) {
      // Fallback to localStorage for anonymous/old behavior
      const key = getOnboardingKey();
      return localStorage.getItem(key) === 'true';
    }

    try {
      // Get the auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session, check localStorage fallback
        const key = getOnboardingKey(userId);
        return localStorage.getItem(key) === 'true';
      }

      // Call Supabase Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-preferences`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.warn('Failed to fetch onboarding preference, defaulting to true');
        return true; // Default to showing onboarding on error
      }

      const data = await response.json();
      return data.show_onboarding !== false; // true or undefined = show
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Fallback to localStorage on error
      const key = getOnboardingKey(userId);
      const localValue = localStorage.getItem(key) === 'true';
      return !localValue; // If localStorage says completed (true), return false for isCompleted check
    }
  },

  /**
   * Mark onboarding as completed (don't show again)
   * Updates Supabase profiles table if userId provided, otherwise localStorage
   */
  markCompleted: async (userId?: string): Promise<void> => {
    if (!userId) {
      // Fallback to localStorage
      const key = getOnboardingKey();
      localStorage.setItem(key, 'true');
      return;
    }

    try {
      // Get the auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session, use localStorage fallback
        const key = getOnboardingKey(userId);
        localStorage.setItem(key, 'true');
        return;
      }

      // Call Supabase Edge Function to set show_onboarding = false
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-preferences`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ show_onboarding: false }),
        }
      );

      if (!response.ok) {
        console.error('Failed to update onboarding preference');
        // Still update localStorage as fallback
        const key = getOnboardingKey(userId);
        localStorage.setItem(key, 'true');
      }
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      // Fallback to localStorage
      const key = getOnboardingKey(userId);
      localStorage.setItem(key, 'true');
    }
  },

  /**
   * Reset onboarding (show it again)
   * Updates Supabase profiles table if userId provided, otherwise localStorage
   */
  reset: async (userId?: string): Promise<void> => {
    if (!userId) {
      // Fallback to localStorage
      const key = getOnboardingKey();
      localStorage.removeItem(key);
      return;
    }

    try {
      // Get the auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session, use localStorage fallback
        const key = getOnboardingKey(userId);
        localStorage.removeItem(key);
        return;
      }

      // Call Supabase Edge Function to set show_onboarding = true
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-preferences`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ show_onboarding: true }),
        }
      );

      if (!response.ok) {
        console.error('Failed to reset onboarding preference');
        // Still update localStorage as fallback
        const key = getOnboardingKey(userId);
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      // Fallback to localStorage
      const key = getOnboardingKey(userId);
      localStorage.removeItem(key);
    }
  },
};
