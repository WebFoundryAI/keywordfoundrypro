import { createClient } from '@/lib/supabase/client';

export interface Preset {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  payload: PresetPayload;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PresetPayload {
  query?: string;
  filters?: {
    minVolume?: number;
    maxVolume?: number;
    minDifficulty?: number;
    maxDifficulty?: number;
    intent?: string[];
    minCpc?: number;
    maxCpc?: number;
  };
  sort?: string;
}

export async function listPresets(): Promise<Preset[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error listing presets:', error);
    return [];
  }

  return data || [];
}

export async function createPreset(
  name: string,
  description: string | null,
  payload: PresetPayload
): Promise<{ data: Preset | null; error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('presets')
    .insert({
      user_id: user.id,
      name,
      description,
      payload,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function deletePreset(
  presetId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('presets')
    .delete()
    .eq('id', presetId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Re-export utils
export { serializeFilters } from './utils';
