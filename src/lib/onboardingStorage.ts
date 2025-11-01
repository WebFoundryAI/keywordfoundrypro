import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

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
   * Check if onboarding has been completed (dismissed) for a user
   * Returns TRUE if the user has completed/dismissed the onboarding tour
   * Returns FALSE if the user has NOT completed it (should see the tour)
   * Uses Supabase profiles table if userId provided, otherwise localStorage
   */
  isCompleted: async (userId?: string): Promise<boolean> => {
    if (!userId) {
      // Fallback to localStorage for anonymous/old behavior
      // If key is 'true', onboarding was completed/dismissed
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
        `https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/onboarding-preferences`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.warn('Failed to fetch onboarding preference, defaulting to not completed');
        return false; // Default to not completed (should show tour) on error
      }

      const data = await response.json();
      // If show_onboarding is false in DB, the tour is completed/dismissed
      // If show_onboarding is true/undefined in DB, the tour should still show (not completed)
      return data.show_onboarding === false;
    } catch (error) {
      logger.error('Error checking onboarding status:', error);
      // Fallback to localStorage on error
      const key = getOnboardingKey(userId);
      return localStorage.getItem(key) === 'true';
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
        `https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/onboarding-preferences`,
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
        logger.error('Failed to update onboarding preference');
        // Still update localStorage as fallback
        const key = getOnboardingKey(userId);
        localStorage.setItem(key, 'true');
      }
    } catch (error) {
      logger.error('Error marking onboarding complete:', error);
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
        `https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/onboarding-preferences`,
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
        logger.error('Failed to reset onboarding preference');
        // Still update localStorage as fallback
        const key = getOnboardingKey(userId);
        localStorage.removeItem(key);
      }
    } catch (error) {
      logger.error('Error resetting onboarding:', error);
      // Fallback to localStorage
      const key = getOnboardingKey(userId);
      localStorage.removeItem(key);
    }
  },
};
