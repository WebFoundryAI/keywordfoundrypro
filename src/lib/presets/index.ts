/**
 * FEATURE DISABLED: Presets table does not exist in database
 * These functions return empty data and log warnings
 */

export interface Preset {
  id: string;
  name: string;
  filters: any;
  user_id: string;
  created_at: string;
}

export async function listPresets(): Promise<Preset[]> {
  console.warn('Presets feature is disabled - presets table does not exist');
  return [];
}

export async function savePreset(
  name: string,
  filters: any
): Promise<{ success: boolean; error?: string }> {
  console.warn('Presets feature is disabled - presets table does not exist');
  return { success: false, error: 'Feature not available' };
}

export async function deletePreset(
  presetId: string
): Promise<{ success: boolean; error?: string }> {
  console.warn('Presets feature is disabled - presets table does not exist');
  return { success: false, error: 'Feature not available' };
}

export function serializeFilters(filters: any): string {
  return JSON.stringify(filters);
}
