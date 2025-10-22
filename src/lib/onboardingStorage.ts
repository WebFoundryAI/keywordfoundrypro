const ONBOARDING_KEY = 'kfp_onboarding_completed';

export const onboardingStorage = {
  isCompleted: (): boolean => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  },

  markCompleted: (): void => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  },

  reset: (): void => {
    localStorage.removeItem(ONBOARDING_KEY);
  },
};
