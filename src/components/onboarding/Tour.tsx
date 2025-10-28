import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { markTourAsSeen, resetTourState } from '@/lib/onboarding/state';

export interface TourStep {
  title: string;
  description: string;
  image?: string;
  highlight?: string; // CSS selector for element to highlight
}

interface TourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Keyword Foundry Pro',
    description:
      'This quick tour will guide you through the core features. You can skip at any time and replay the tour later from the Help menu.',
  },
  {
    title: 'Create Your First Project',
    description:
      'Start by creating a project to organize your keyword research. Click "New Project" in the sidebar to get started.',
    highlight: '[data-tour="new-project"]',
  },
  {
    title: 'Run Keyword Research',
    description:
      'Enter your seed keywords and location to discover keyword opportunities. Our AI will analyze search intent, competition, and trends.',
    highlight: '[data-tour="research-form"]',
  },
  {
    title: 'Filter and Analyze Results',
    description:
      'Use filters to find low-competition, high-value keywords. Filter by intent, difficulty, search volume, and SERP features.',
    highlight: '[data-tour="filters"]',
  },
  {
    title: 'Export Your Insights',
    description:
      'Export your findings to CSV or integrate with your content workflow. Track your progress over time with snapshots.',
    highlight: '[data-tour="export"]',
  },
];

export function Tour({ open, onOpenChange, onComplete }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalSteps = TOUR_STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Cleanup highlights when component unmounts or step changes
  useEffect(() => {
    return () => {
      document.querySelectorAll('[data-tour-highlight]').forEach((el) => {
        el.removeAttribute('data-tour-highlight');
      });
    };
  }, [currentStep]);

  // Add highlight to target element
  useEffect(() => {
    if (open && step.highlight) {
      const element = document.querySelector(step.highlight);
      if (element) {
        element.setAttribute('data-tour-highlight', 'true');
      }
    }
  }, [open, step.highlight]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = async () => {
    setIsCompleting(true);
    await markTourAsSeen();
    setIsCompleting(false);
    onOpenChange(false);
    onComplete?.();
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    await markTourAsSeen();
    setIsCompleting(false);
    onOpenChange(false);
    onComplete?.();
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleSkip();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        aria-describedby="tour-description"
      >
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription id="tour-description">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Progress value={progress} className="w-full" />
          <div className="text-center text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1 sm:flex-none"
              >
                Previous
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isCompleting}
              className="flex-1 sm:flex-none"
            >
              Skip Tour
            </Button>
          </div>
          <Button
            onClick={handleNext}
            disabled={isCompleting}
            className="w-full sm:w-auto"
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage tour state
 */
export function useTour() {
  const [isOpen, setIsOpen] = useState(false);

  const startTour = () => {
    resetTourState(); // Clear localStorage flag for replay
    setIsOpen(true);
  };

  const closeTour = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    startTour,
    closeTour,
  };
}
