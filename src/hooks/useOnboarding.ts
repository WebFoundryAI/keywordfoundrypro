import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { onboardingStorage } from '@/lib/onboardingStorage';

export const useOnboarding = () => {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Only show tour for authenticated users who haven't seen it
    if (user && !onboardingStorage.isCompleted()) {
      // Small delay to let the page load
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const completeTour = () => {
    onboardingStorage.markCompleted();
    setShowTour(false);
  };

  const resetTour = () => {
    onboardingStorage.reset();
    setShowTour(true);
  };

  return {
    showTour,
    completeTour,
    resetTour,
    startTour: () => setShowTour(true),
  };
};
