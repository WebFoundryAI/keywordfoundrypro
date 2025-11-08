/**
 * Remember Me functionality
 * Manages session persistence preferences
 */

const REMEMBER_ME_KEY = 'auth_remember_me';
const SESSION_ACTIVE_KEY = 'auth_session_active';

/**
 * Set the Remember Me preference
 * @param remember - Whether to remember the user across browser sessions
 */
export const setRememberMePreference = (remember: boolean): void => {
  if (remember) {
    // Store in localStorage to persist across browser sessions
    localStorage.setItem(REMEMBER_ME_KEY, 'true');
  } else {
    // Don't store in localStorage, only mark session as active in sessionStorage
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
  }
};

/**
 * Check if user should remain logged in
 * @returns true if the user should stay logged in
 */
export const shouldRemainLoggedIn = (): boolean => {
  // Check if Remember Me was enabled
  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  
  // Check if this is an active session (within the same browser session)
  const sessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY) === 'true';
  
  return rememberMe || sessionActive;
};

/**
 * Mark the session as active (called on successful auth)
 */
export const markSessionActive = (): void => {
  sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
};

/**
 * Clear Remember Me preferences (called on sign out)
 */
export const clearRememberMePreferences = (): void => {
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(SESSION_ACTIVE_KEY);
};
