/**
 * Data Subject Rights - Data Export
 * Generates a complete export of user data for GDPR compliance
 */

import { supabase } from '@/integrations/supabase/client';

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
  profile: Record<string, unknown> | null;
  keyword_research: Record<string, unknown>[];
  exports: Record<string, unknown>[];
  snapshots: Record<string, unknown>[];
  clusters: Record<string, unknown>[];
  audit_events: Record<string, unknown>[];
  usage_stats: Record<string, unknown>[];
  exported_at: string;
}

/**
 * Export all user data
 * @returns Complete user data bundle or error
 */
export async function exportUserData(): Promise<{
  success: boolean;
  data?: UserDataExport;
  error?: string;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Collect all user data in parallel
    const [
      profileData,
      keywordResearchData,
      exportsData,
      snapshotsData,
      clustersData,
      auditEventsData,
      usageData,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('keyword_research').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('exports').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('project_snapshots').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('clusters').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('audit_events').select('*').eq('user_id', user.id),
      supabase.from('dataforseo_usage').select('*').eq('user_id', user.id),
    ]);

    const exportData: UserDataExport = {
      user: {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at || '',
      },
      profile: profileData.data || null,
      keyword_research: keywordResearchData.data || [],
      exports: exportsData.data || [],
      snapshots: snapshotsData.data || [],
      clusters: clustersData.data || [],
      audit_events: auditEventsData.data || [],
      usage_stats: usageData.data || [],
      exported_at: new Date().toISOString(),
    };

    // Record audit event
    await supabase.from('audit_events').insert({
      user_id: user.id,
      action: 'dsr_export',
      meta: { exported_at: exportData.exported_at },
    });

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Data export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Download user data as JSON file
 * @param data - User data export
 */
export function downloadDataExport(data: UserDataExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `keyword-foundry-data-export-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
