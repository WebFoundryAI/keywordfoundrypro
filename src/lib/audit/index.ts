/**
 * Audit Trail - Record key user actions for compliance and troubleshooting
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'query_executed'
  | 'export_created'
  | 'snapshot_saved'
  | 'snapshot_loaded'
  | 'snapshot_deleted'
  | 'limit_reached'
  | 'auth_login'
  | 'auth_logout'
  | 'profile_updated'
  | 'project_created'
  | 'project_deleted';

export interface AuditEventMeta {
  endpoint?: string;
  row_count?: number;
  filters_hash?: string;
  export_type?: string;
  snapshot_id?: string;
  limit_type?: string;
  used?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface RecordAuditEventParams {
  action: AuditAction;
  projectId?: string;
  meta?: AuditEventMeta;
}

export interface AuditEvent {
  id: string;
  user_id: string;
  project_id: string | null;
  action: string;
  meta: AuditEventMeta | null;
  created_at: string;
}

/**
 * Record an audit event
 */
export async function recordAuditEvent(
  params: RecordAuditEventParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn('[Audit] Not authenticated, skipping audit event');
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.from('audit_events').insert([{
      user_id: user.id,
      project_id: params.projectId || null,
      action: params.action,
      metadata: params.meta || null,
    }]);

    if (error) {
      console.error('[Audit] Error recording audit event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Audit] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to record audit event',
    };
  }
}

/**
 * Get audit events for the current user
 */
export async function getAuditEvents(
  options?: {
    projectId?: string;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  }
): Promise<{ events: AuditEvent[]; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { events: [], error: 'Not authenticated' };
    }

    let query = supabase
      .from('audit_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (options?.projectId) {
      query = query.eq('project_id', options.projectId);
    }

    if (options?.action) {
      query = query.eq('action', options.action);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Audit] Error fetching audit events:', error);
      return { events: [], error: error.message };
    }

    return {
      events: (data || []).map(event => ({
        ...event,
        meta: event.metadata as AuditEventMeta,
      })) as AuditEvent[],
    };
  } catch (err) {
    console.error('[Audit] Unexpected error:', err);
    return {
      events: [],
      error: err instanceof Error ? err.message : 'Failed to fetch audit events',
    };
  }
}

/**
 * Get audit events for all users (admin only)
 */
export async function getAuditEventsAdmin(
  options?: {
    userId?: string;
    projectId?: string;
    action?: AuditAction;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ events: AuditEvent[]; error?: string }> {
  try {
    let query = supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options?.projectId) {
      query = query.eq('project_id', options.projectId);
    }

    if (options?.action) {
      query = query.eq('action', options.action);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options?.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Audit] Error fetching audit events (admin):', error);
      return { events: [], error: error.message };
    }

    return {
      events: (data || []).map(event => ({
        ...event,
        meta: event.metadata as AuditEventMeta,
      })) as AuditEvent[],
    };
  } catch (err) {
    console.error('[Audit] Unexpected error:', err);
    return {
      events: [],
      error: err instanceof Error ? err.message : 'Failed to fetch audit events',
    };
  }
}

/**
 * Helper to create a hash of filters for audit tracking
 */
export function hashFilters(filters: Record<string, unknown>): string {
  // Simple hash for audit purposes - just stringify and hash
  const str = JSON.stringify(filters, Object.keys(filters).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
