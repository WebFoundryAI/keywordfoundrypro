/**
 * Environment variable validation utility
 * Validates required environment variables and logs warnings in development
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appBaseUrl: string;
}

import { logger } from './logger';

/**
 * Validates a URL string
 */
function isValidUrl(url: string, requireHttps: boolean = false): boolean {
  try {
    const parsed = new URL(url);
    if (requireHttps && !import.meta.env.DEV && parsed.protocol !== 'https:') {
      return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates required environment variables
 * Returns the config if valid, or logs warnings in development
 */
export function validateEnv(): EnvConfig | null {
  // Get values from environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vhjffdzroebdkbmvcpgv.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  // App base URL from env (with fallback)
  const appBaseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;

  const errors: string[] = [];

  // Validate Supabase URL
  if (!supabaseUrl || !isValidUrl(supabaseUrl, true)) {
    errors.push('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }

  // Validate Supabase Anon Key
  if (!supabaseAnonKey || supabaseAnonKey.length < 20) {
    errors.push('VITE_SUPABASE_ANON_KEY must be a non-empty string (check your .env file)');
  }

  // Validate App Base URL
  if (!appBaseUrl || !isValidUrl(appBaseUrl)) {
    errors.push('VITE_APP_BASE_URL must be a valid URL (use http://localhost:5173 for dev)');
  }

  // Log warnings in development only
  if (errors.length > 0 && import.meta.env.DEV) {
    logger.warn(
      '⚠️  Environment Configuration Issues:\n' +
      errors.map(e => `   - ${e}`).join('\n') +
      '\n\nPlease check your .env file. See .env.example for required format.' +
      '\n\nIMPORTANT: Never hard-code API keys in source files. Always use environment variables.'
    );
  }

  // Return config even with warnings (don't crash the app)
  return {
    supabaseUrl,
    supabaseAnonKey,
    appBaseUrl
  };
}

/**
 * Get the validated app base URL for OAuth redirects
 */
export function getAppBaseUrl(): string {
  const config = validateEnv();
  return config?.appBaseUrl || window.location.origin;
}
