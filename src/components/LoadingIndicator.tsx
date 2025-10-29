/**
 * ISSUE FIX #4: Enhanced loading indicator for long-running keyword queries
 *
 * Features:
 * - Visual progress animation
 * - Estimated time remaining for queries >3 seconds
 * - Accessibility support (ARIA labels, screen reader announcements)
 * - Responsive design for all device sizes
 * - Graceful fallback for quick queries
 */

import { useEffect, useState } from "react";
import { Loader2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface LoadingIndicatorProps {
  /** Whether loading is active */
  isLoading: boolean;
  /** Optional custom message */
  message?: string;
  /** Show progress bar for long queries (>3s) */
  showProgress?: boolean;
  /** Estimated duration in seconds (optional) */
  estimatedDuration?: number;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function LoadingIndicator({
  isLoading,
  message = "Processing your request...",
  showProgress = true,
  estimatedDuration,
  compact = false,
  className
}: LoadingIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showLongRunningMessage, setShowLongRunningMessage] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      setShowLongRunningMessage(false);
      setProgress(0);
      return;
    }

    // Track elapsed time
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedTime(elapsed);

      // Show long-running message after 3 seconds
      if (elapsed > 3) {
        setShowLongRunningMessage(true);
      }

      // Update progress bar (simulated progress for UX)
      if (estimatedDuration) {
        // Linear progress based on estimated duration
        const calculatedProgress = Math.min((elapsed / estimatedDuration) * 100, 95);
        setProgress(calculatedProgress);
      } else {
        // Asymptotic progress that never reaches 100%
        // Slows down as time passes to avoid appearing stuck
        const asymptotic = 95 * (1 - Math.exp(-elapsed / 10));
        setProgress(asymptotic);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, estimatedDuration]);

  if (!isLoading) return null;

  // Compact inline variant
  if (compact) {
    return (
      <div
        className={cn("flex items-center gap-2 text-sm", className)}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-muted-foreground">{message}</span>
      </div>
    );
  }

  // Full loading indicator with progress
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-muted/30 border border-border/50",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      {/* Spinner */}
      <div className="flex items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-base font-medium text-foreground">
          {message}
        </p>
      </div>

      {/* Progress bar for long-running queries */}
      {showProgress && showLongRunningMessage && (
        <>
          <div className="w-full max-w-md space-y-2">
            <Progress
              value={progress}
              className="h-2"
              aria-label={`Progress: ${Math.round(progress)}%`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {elapsedTime < 60
                    ? `${Math.floor(elapsedTime)}s elapsed`
                    : `${Math.floor(elapsedTime / 60)}m ${Math.floor(elapsedTime % 60)}s elapsed`
                  }
                </span>
              </div>
              {estimatedDuration && elapsedTime < estimatedDuration && (
                <span>
                  ~{Math.max(0, Math.ceil(estimatedDuration - elapsedTime))}s remaining
                </span>
              )}
            </div>
          </div>

          {/* Long-running query message */}
          <div className="text-xs text-center text-muted-foreground max-w-md">
            <p>
              This query is taking longer than usual. Large keyword lists or complex
              analyses may take up to 30 seconds.
            </p>
            <p className="mt-1 text-primary/70">
              Please don't close this window...
            </p>
          </div>
        </>
      )}

      {/* Accessibility: Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {showLongRunningMessage &&
          `Loading in progress. ${Math.floor(elapsedTime)} seconds elapsed. Please wait.`
        }
      </div>
    </div>
  );
}

/**
 * Hook for managing loading state with automatic timeout detection
 */
export function useLoadingState(timeoutMs: number = 30000) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsTimeout(false);
      return;
    }

    const timeout = setTimeout(() => {
      setIsTimeout(true);
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [isLoading, timeoutMs]);

  return {
    isLoading,
    isTimeout,
    startLoading: () => {
      setIsLoading(true);
      setIsTimeout(false);
    },
    stopLoading: () => {
      setIsLoading(false);
      setIsTimeout(false);
    }
  };
}
