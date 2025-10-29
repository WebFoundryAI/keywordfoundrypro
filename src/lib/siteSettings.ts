/**
 * Site settings helpers for reading/writing application-wide configuration
 * Stored in the site_settings database table
 */

import { supabase } from '@/integrations/supabase/client';

export interface SiteSetting {
  key: string;
  bool_value: boolean | null;
  json_value: Record<string, unknown> | null;
  updated_at: string;
}

/**
 * Get the cookie banner enabled state
 * Returns false by default if not set or on error
 */
export async function getCookieBannerEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('bool_value')
      .eq('key', 'cookie_banner_enabled')
      .maybeSingle();

    if (error) {
      console.error('getCookieBannerEnabled error:', error);
      return false;
    }

    return Boolean(data?.bool_value);
  } catch (err) {
    console.error('getCookieBannerEnabled exception:', err);
    return false;
  }
}

/**
 * Set the cookie banner enabled state (admin only)
 * This function will fail if the user is not an admin (RLS policy enforced)
 */
export async function setCookieBannerEnabled(enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { key: 'cookie_banner_enabled', bool_value: enabled },
      { onConflict: 'key' }
    );

  if (error) {
    throw new Error(`Failed to update cookie banner setting: ${error.message}`);
  }
}

/**
 * Get a site setting by key
 */
export async function getSiteSetting(key: string): Promise<SiteSetting | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`getSiteSetting(${key}) error:`, error);
    return null;
  }

  return data;
}

/**
 * Set a site setting (admin only)
 */
export async function setSiteSetting(
  key: string,
  boolValue?: boolean,
  jsonValue?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      {
        key,
        bool_value: boolValue ?? null,
        json_value: jsonValue ?? null,
      },
      { onConflict: 'key' }
    );

  if (error) {
    throw new Error(`Failed to update site setting ${key}: ${error.message}`);
  }
}
