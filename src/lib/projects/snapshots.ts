/**
 * Project Snapshots - Save and restore project state
 * Allows users to save current filters, sort, pagination, and other UI state
 */

import { supabase } from '@/integrations/supabase/client';

export interface SnapshotPayload {
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    pageSize: number;
  };
  queryParams?: Record<string, string>;
  searchTerm?: string;
  lastUpdated?: string;
}

export interface ProjectSnapshot {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string | null;
  state: SnapshotPayload;
  created_at: string;
  deleted_at: string | null;
  updated_at?: string;
}

export interface SaveSnapshotParams {
  projectId: string;
  payload: SnapshotPayload;
  name?: string;
}

export interface LoadSnapshotResult {
  snapshot: ProjectSnapshot | null;
  error?: string;
}

/**
 * Save current project state as a snapshot
 */
export async function saveSnapshot(
  params: SaveSnapshotParams
): Promise<{ id: string | null; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { id: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('project_snapshots')
      .insert([{
        name: params.name,
        user_id: user.id,
        project_id: params.projectId,
        state: params.state as any,
      }])
      .select('id')
      .single();

    if (error) {
      console.error('[Snapshots] Error saving snapshot:', error);
      return { id: null, error: error.message };
    }

    return { id: data.id };
  } catch (err) {
    console.error('[Snapshots] Unexpected error:', err);
    return {
      id: null,
      error: err instanceof Error ? err.message : 'Failed to save snapshot',
    };
  }
}

/**
 * Load all snapshots for a project
 */
export async function listSnapshots(
  projectId: string
): Promise<{ snapshots: ProjectSnapshot[]; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { snapshots: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('project_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Snapshots] Error listing snapshots:', error);
      return { snapshots: [], error: error.message };
    }

    return { 
      snapshots: (data || []).map(snap => ({
        ...snap,
        state: snap.state as SnapshotPayload,
      })) as ProjectSnapshot[]
    };
  } catch (err) {
    console.error('[Snapshots] Unexpected error:', err);
    return {
      snapshots: [],
      error: err instanceof Error ? err.message : 'Failed to list snapshots',
    };
  }
}

/**
 * Load a specific snapshot by ID
 */
export async function loadSnapshot(
  snapshotId: string
): Promise<LoadSnapshotResult> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { snapshot: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('project_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[Snapshots] Error loading snapshot:', error);
      return { snapshot: null, error: error.message };
    }

    return { 
      snapshot: {
        ...data,
        state: data.state as SnapshotPayload,
      } as ProjectSnapshot
    };
  } catch (err) {
    console.error('[Snapshots] Unexpected error:', err);
    return {
      snapshot: null,
      error: err instanceof Error ? err.message : 'Failed to load snapshot',
    };
  }
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(
  snapshotId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('project_snapshots')
      .delete()
      .eq('id', snapshotId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Snapshots] Error deleting snapshot:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Snapshots] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete snapshot',
    };
  }
}

/**
 * Update snapshot name
 */
export async function updateSnapshotName(
  snapshotId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('project_snapshots')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', snapshotId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Snapshots] Error updating snapshot:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Snapshots] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update snapshot',
    };
  }
}

/**
 * Verify snapshot payload integrity
 * Ensures the payload has expected structure
 */
export function validateSnapshotPayload(payload: unknown): payload is SnapshotPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const p = payload as Record<string, unknown>;

  // All fields are optional, but if present, must be correct type
  if (p.filters !== undefined && typeof p.filters !== 'object') {
    return false;
  }

  if (p.sort !== undefined) {
    const sort = p.sort as Record<string, unknown>;
    if (
      typeof sort.field !== 'string' ||
      (sort.direction !== 'asc' && sort.direction !== 'desc')
    ) {
      return false;
    }
  }

  if (p.pagination !== undefined) {
    const pagination = p.pagination as Record<string, unknown>;
    if (
      typeof pagination.page !== 'number' ||
      typeof pagination.pageSize !== 'number'
    ) {
      return false;
    }
  }

  return true;
}
