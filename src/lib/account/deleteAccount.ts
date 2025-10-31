/**
 * Data Subject Rights - Account Deletion
 * Soft delete user account and anonymize data for GDPR compliance
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Soft delete user account and anonymize personal data
 * @returns Success status and error message if any
 */
export async function deleteUserAccount(): Promise<{
  success: boolean;
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

    const now = new Date().toISOString();

    // Soft delete all user-owned records
    const deleteOperations = [
      supabase
        .from('keyword_research')
        .update({ deleted_at: now })
        .eq('user_id', user.id)
        .is('deleted_at', null),
      supabase
        .from('cached_results')
        .update({ deleted_at: now })
        .eq('user_id', user.id)
        .is('deleted_at', null),
      supabase
        .from('project_snapshots')
        .update({ deleted_at: now })
        .eq('user_id', user.id)
        .is('deleted_at', null),
      supabase
        .from('exports')
        .update({ deleted_at: now })
        .eq('user_id', user.id)
        .is('deleted_at', null),
      supabase
        .from('clusters')
        .update({ deleted_at: now })
        .eq('user_id', user.id)
        .is('deleted_at', null),
    ];

    await Promise.all(deleteOperations);

    // Anonymize profile (keep for referential integrity, remove PII)
    await supabase
      .from('profiles')
      .update({
        email: `deleted-${user.id}@deleted.local`,
        display_name: 'Deleted User',
        deleted_at: now,
      })
      .eq('user_id', user.id);

    // Record audit event before deletion
    await supabase.from('audit_events').insert({
      user_id: user.id,
      action: 'dsr_delete_requested',
      meta: { deleted_at: now, reason: 'User requested account deletion' },
    });

    // Sign out user
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error('Account deletion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deletion failed',
    };
  }
}

/**
 * Check if account deletion is allowed
 * @returns true if deletion is allowed, or error message
 */
export async function canDeleteAccount(): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { allowed: false, reason: 'Not authenticated' };
    }

    // Check for active subscriptions (if needed)
    // const { data: limits } = await supabase
    //   .from('user_limits')
    //   .select('plan_id')
    //   .eq('user_id', user.id)
    //   .single();

    // if (limits && limits.plan_id === 'pro') {
    //   return { allowed: false, reason: 'Please cancel your subscription first' };
    // }

    return { allowed: true };
  } catch (error) {
    console.error('Delete check error:', error);
    return { allowed: false, reason: 'Unable to verify account status' };
  }
}
