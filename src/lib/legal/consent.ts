/**
 * Cookie consent management
 * Handles user consent for cookies and tracking
 */

export type ConsentLevel = 'all' | 'essential' | 'none';

interface ConsentState {
  level: ConsentLevel;
  timestamp: number;
}

const CONSENT_COOKIE_NAME = 'kfp_cookie_consent';
const CONSENT_COOKIE_DAYS = 365;

/**
 * Get current consent level from cookie
 * @returns Consent level or null if not set
 */
export function getConsent(): ConsentState | null {
  if (typeof document === 'undefined') return null;

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!cookie) return null;

  try {
    const value = cookie.split('=')[1];
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}

/**
 * Set consent level
 * @param level - Consent level to set
 */
export function setConsent(level: ConsentLevel): void {
  if (typeof document === 'undefined') return;

  const state: ConsentState = {
    level,
    timestamp: Date.now(),
  };

  const expires = new Date();
  expires.setDate(expires.getDate() + CONSENT_COOKIE_DAYS);

  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(state)
  )}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Check if analytics scripts should be loaded
 * @returns true if consent allows analytics
 */
export function shouldLoadAnalytics(): boolean {
  const consent = getConsent();
  return consent?.level === 'all';
}

/**
 * Check if user has made a consent choice
 * @returns true if consent has been set
 */
export function hasConsent(): boolean {
  return getConsent() !== null;
}

/**
 * Clear consent cookie (for testing/reset)
 */
export function clearConsent(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
