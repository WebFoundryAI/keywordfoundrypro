import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

const ONBOARDING_STORAGE_KEY = 'kfp_onboarding_completed';

export const useOnboarding = () => {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Only show tour for authenticated users who haven't seen it
    if (user) {
      const hasCompletedOnboarding = localStorage.getItem(
        `${ONBOARDING_STORAGE_KEY}_${user.id}`
      );
      
      if (!hasCompletedOnboarding) {
        // Small delay to let the page load
        const timer = setTimeout(() => setShowTour(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const completeTour = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`, 'true');
    }
    setShowTour(false);
  };

  const resetTour = () => {
    if (user) {
      localStorage.removeItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`);
      setShowTour(true);
    }
  };

  return {
    showTour,
    completeTour,
    resetTour,
    startTour: () => setShowTour(true),
  };
};
