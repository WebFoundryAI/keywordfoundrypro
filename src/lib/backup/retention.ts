import { createClient } from '@supabase/supabase-js';

const RETENTION_DAYS = 30;

export interface RetentionResult {
  deleted_backups: number;
  deleted_files: number;
  errors: string[];
}

/**
 * Clean up backups older than 30 days
 * Removes both storage files and manifest records
 */
export async function cleanupOldBackups(): Promise<RetentionResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for retention cleanup');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const result: RetentionResult = {
    deleted_backups: 0,
    deleted_files: 0,
    errors: [],
  };

  // Calculate cutoff date (30 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  // Find old backup manifests
  const { data: oldManifests, error: fetchError } = await supabase
    .from('backup_manifests')
    .select('*')
    .lt('run_at', cutoffDate.toISOString())
    .order('run_at', { ascending: true });

  if (fetchError) {
    result.errors.push(`Failed to fetch old manifests: ${fetchError.message}`);
    return result;
  }

  if (!oldManifests || oldManifests.length === 0) {
    return result; // No old backups to clean up
  }

  // Delete storage files for each old backup
  for (const manifest of oldManifests) {
    try {
      const tables = manifest.tables as Record<string, any>;

      for (const [tableName, tableInfo] of Object.entries(tables)) {
        if (tableInfo.file) {
          const { error: deleteError } = await supabase.storage
            .from('database-backups')
            .remove([tableInfo.file]);

          if (deleteError) {
            result.errors.push(
              `Failed to delete ${tableInfo.file}: ${deleteError.message}`
            );
          } else {
            result.deleted_files++;
          }
        }
      }

      // Delete manifest record
      const { error: deleteManifestError } = await supabase
        .from('backup_manifests')
        .delete()
        .eq('id', manifest.id);

      if (deleteManifestError) {
        result.errors.push(
          `Failed to delete manifest ${manifest.id}: ${deleteManifestError.message}`
        );
      } else {
        result.deleted_backups++;
      }
    } catch (error) {
      result.errors.push(
        `Error processing manifest ${manifest.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Get backup retention statistics
 */
export async function getRetentionStats(): Promise<{
  total_backups: number;
  backups_within_retention: number;
  backups_expired: number;
  oldest_backup_date: string | null;
  newest_backup_date: string | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  // Get all backups
  const { data: allBackups, error: allError } = await supabase
    .from('backup_manifests')
    .select('run_at')
    .order('run_at', { ascending: false });

  if (allError || !allBackups) {
    return {
      total_backups: 0,
      backups_within_retention: 0,
      backups_expired: 0,
      oldest_backup_date: null,
      newest_backup_date: null,
    };
  }

  // Get expired backups
  const { data: expiredBackups, error: expiredError } = await supabase
    .from('backup_manifests')
    .select('run_at')
    .lt('run_at', cutoffDate.toISOString());

  const expiredCount = expiredError || !expiredBackups ? 0 : expiredBackups.length;

  return {
    total_backups: allBackups.length,
    backups_within_retention: allBackups.length - expiredCount,
    backups_expired: expiredCount,
    oldest_backup_date: allBackups.length > 0
      ? allBackups[allBackups.length - 1].run_at
      : null,
    newest_backup_date: allBackups.length > 0
      ? allBackups[0].run_at
      : null,
  };
}

/**
 * Preview what would be deleted without actually deleting
 */
export async function previewRetentionCleanup(): Promise<{
  manifests_to_delete: number;
  files_to_delete: number;
  oldest_date: string | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  const { data: oldManifests, error } = await supabase
    .from('backup_manifests')
    .select('*')
    .lt('run_at', cutoffDate.toISOString());

  if (error || !oldManifests) {
    return {
      manifests_to_delete: 0,
      files_to_delete: 0,
      oldest_date: null,
    };
  }

  let fileCount = 0;
  for (const manifest of oldManifests) {
    const tables = manifest.tables as Record<string, any>;
    fileCount += Object.keys(tables).length;
  }

  return {
    manifests_to_delete: oldManifests.length,
    files_to_delete: fileCount,
    oldest_date: oldManifests.length > 0
      ? oldManifests[oldManifests.length - 1].run_at
      : null,
  };
}
