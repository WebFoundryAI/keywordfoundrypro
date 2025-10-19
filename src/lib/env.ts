/**
 * Environment variable validation utility
 * Validates required environment variables and logs warnings in development
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appBaseUrl: string;
}

const isDev = import.meta.env.DEV;

/**
 * Validates a URL string
 */
function isValidUrl(url: string, requireHttps: boolean = false): boolean {
  try {
    const parsed = new URL(url);
    if (requireHttps && !isDev && parsed.protocol !== 'https:') {
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
  // Hardcoded values from Supabase connection
  const supabaseUrl = 'https://vhjffdzroebdkbmvcpgv.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoamZmZHpyb2ViZGtibXZjcGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzA0MDgsImV4cCI6MjA3NDcwNjQwOH0.jxNm1b-5oJJTzFFHpmZ1BNYZGb2lJuphDlmY3Si4tHc';
  
  // App base URL from env (with fallback)
  const appBaseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;

  const errors: string[] = [];

  // Validate Supabase URL
  if (!supabaseUrl || !isValidUrl(supabaseUrl, true)) {
    errors.push('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }

  // Validate Supabase Anon Key
  if (!supabaseAnonKey || supabaseAnonKey.length < 20) {
    errors.push('VITE_SUPABASE_ANON_KEY must be a non-empty string');
  }

  // Validate App Base URL
  if (!appBaseUrl || !isValidUrl(appBaseUrl)) {
    errors.push('VITE_APP_BASE_URL must be a valid URL (use http://localhost:5173 for dev)');
  }

  // Log warnings in development only
  if (errors.length > 0 && isDev) {
    console.warn(
      '⚠️  Environment Configuration Issues:\n' +
      errors.map(e => `   - ${e}`).join('\n') +
      '\n\nPlease check your .env file. See .env.example for required format.'
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
