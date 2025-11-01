import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { analytics } from '@/lib/analytics';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

const steps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Welcome to Keyword Foundry Pro!</h3>
        <p>Let's take a quick 60-second tour to show you how to conduct professional keyword research.</p>
        <p className="text-sm text-muted-foreground mt-2">You can skip this tour and access it later from your profile menu.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="research-tab"]',
    content: 'Start here to research keywords. Enter any seed keyword to discover search volume, difficulty, and intent data.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="keyword-input"]',
    content: 'Enter your seed keyword here. Try "best running shoes" to see how it works.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="language-select"]',
    content: 'Choose from 10+ languages and global locations for localized keyword data.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="submit-button"]',
    content: 'Click here to get real-time keyword metrics powered by DataForSEO.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="competitor-tab"]',
    content: 'After your first research, try Competitor Analysis to discover keyword gaps between you and competitors.',
    disableBeacon: true,
  },
];

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Only show on /research and if user wants to see onboarding
    const checkOnboarding = async () => {
      if (location.pathname === '/research' && user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('show_onboarding')
            .eq('user_id', user.id)
            .single();

          // Show tour if show_onboarding is true
          if (profile?.show_onboarding) {
            // Delay to let page render
            setTimeout(() => setRun(true), 500);
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
        }
      }
    };

    checkOnboarding();
  }, [location, user]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      if (user) {
        // Set show_onboarding to false in Supabase
        await supabase
          .from('profiles')
          .update({ show_onboarding: false })
          .eq('user_id', user.id);
      }
      setRun(false);

      // Track completion analytics
      if (status === STATUS.FINISHED) {
        analytics.event('Onboarding Completed');
      } else if (status === STATUS.SKIPPED) {
        analytics.event('Onboarding Skipped');
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        skip: "Don't show again",
        next: 'Next',
        back: 'Back',
        last: 'Finish',
      }}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
        },
      }}
    />
  );
}
