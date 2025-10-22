const ONBOARDING_KEY_PREFIX = 'kfp_onboarding_completed';

/**
 * Get the user-specific onboarding key
 * Falls back to non-user-specific key for backwards compatibility
 */
const getOnboardingKey = (userId?: string): string => {
  return userId ? `${ONBOARDING_KEY_PREFIX}_${userId}` : ONBOARDING_KEY_PREFIX;
};

export const onboardingStorage = {
  isCompleted: (userId?: string): boolean => {
    const key = getOnboardingKey(userId);
    return localStorage.getItem(key) === 'true';
  },

  markCompleted: (userId?: string): void => {
    const key = getOnboardingKey(userId);
    localStorage.setItem(key, 'true');
  },

  reset: (userId?: string): void => {
    const key = getOnboardingKey(userId);
    localStorage.removeItem(key);
  },
};
