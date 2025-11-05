const EXCLUSION_KEY = 'analytics_excluded_session';
const EXCLUSION_DURATION = 60 * 60 * 1000; // 1 hour

interface ExclusionData {
  excluded: boolean;
  timestamp: number;
}

/**
 * Set analytics exclusion flag in session storage
 * @param excluded - Whether to exclude from analytics
 */
export function setAnalyticsExclusion(excluded: boolean): void {
  if (excluded) {
    const data: ExclusionData = {
      excluded: true,
      timestamp: Date.now()
    };
    sessionStorage.setItem(EXCLUSION_KEY, JSON.stringify(data));
  } else {
    sessionStorage.removeItem(EXCLUSION_KEY);
  }
}

/**
 * Check if current user should be excluded from analytics
 * @returns true if excluded, false otherwise
 */
export function isExcludedFromAnalytics(): boolean {
  const stored = sessionStorage.getItem(EXCLUSION_KEY);
  if (!stored) return false;
  
  try {
    const { excluded, timestamp }: ExclusionData = JSON.parse(stored);
    
    // Check if exclusion is stale (older than 1 hour)
    if (Date.now() - timestamp > EXCLUSION_DURATION) {
      sessionStorage.removeItem(EXCLUSION_KEY);
      return false;
    }
    
    return excluded === true;
  } catch {
    // If parsing fails, clear and return false
    sessionStorage.removeItem(EXCLUSION_KEY);
    return false;
  }
}

/**
 * Clear analytics exclusion flag
 */
export function clearAnalyticsExclusion(): void {
  sessionStorage.removeItem(EXCLUSION_KEY);
}
