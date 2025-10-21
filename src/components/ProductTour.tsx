import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocation } from 'react-router-dom';

interface ProductTourProps {
  run?: boolean;
  onComplete?: () => void;
}

export const ProductTour = ({ run = false, onComplete }: ProductTourProps) => {
  const [runTour, setRunTour] = useState(run);
  const location = useLocation();

  useEffect(() => {
    setRunTour(run);
  }, [run]);

  const steps: Step[] = [
    {
      target: 'body',
      content: 'Welcome to Keyword Foundry Pro! Let me show you around.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="research"]',
      content: 'Start here by entering a seed keyword to analyze. This is where all your keyword research begins.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="navigation"]',
      content: 'Navigate between different analysis tools using this menu. Each tool provides unique insights.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="user-menu"]',
      content: 'Access your profile, subscription details, and settings from here.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="theme-toggle"]',
      content: 'Switch between light and dark mode for your preferred viewing experience.',
      placement: 'bottom',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      onComplete?.();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          arrowColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: 'var(--radius)',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: '0.5rem',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
};
