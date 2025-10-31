/**
 * FEATURE DISABLED: site_settings table does not exist in database
 * These functions return defaults and log warnings
 */

export interface SiteSetting {
  key: string;
  bool_value: boolean | null;
  json_value: Record<string, unknown> | null;
  updated_at: string;
}

export async function getCookieBannerEnabled(): Promise<boolean> {
  console.warn('Site settings feature is disabled - site_settings table does not exist');
  return false;
}

export async function setCookieBannerEnabled(enabled: boolean): Promise<void> {
  console.warn('Site settings feature is disabled - site_settings table does not exist');
}

export async function getSiteSetting(key: string): Promise<SiteSetting | null> {
  console.warn('Site settings feature is disabled - site_settings table does not exist');
  return null;
}

export async function setSiteSetting(
  key: string,
  boolValue?: boolean | null,
  jsonValue?: Record<string, unknown> | null
): Promise<void> {
  console.warn('Site settings feature is disabled - site_settings table does not exist');
}

export async function deleteSiteSetting(key: string): Promise<void> {
  console.warn('Site settings feature is disabled - site_settings table does not exist');
}
