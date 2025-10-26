import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export interface RestoreTableResult {
  table: string;
  rows_restored: number;
  checksum_verified: boolean;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  tables: Record<string, RestoreTableResult>;
  duration_ms: number;
  errors: string[];
}

/**
 * Restore database from a backup manifest
 * DEV/STAGING ONLY - should never run in production
 */
export async function restoreFromBackup(
  manifestId: string
): Promise<RestoreResult> {
  // Safety check - only allow in development/staging
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Restore is not allowed in production environment');
  }

  const startTime = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for restore');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const results: Record<string, RestoreTableResult> = {};
  const errors: string[] = [];

  // Fetch backup manifest
  const { data: manifest, error: manifestError } = await supabase
    .from('backup_manifests')
    .select('*')
    .eq('id', manifestId)
    .single();

  if (manifestError || !manifest) {
    throw new Error(
      `Failed to fetch backup manifest: ${manifestError?.message || 'Not found'}`
    );
  }

  const tables = manifest.tables as Record<string, any>;

  // Restore each table
  for (const [tableName, tableInfo] of Object.entries(tables)) {
    try {
      const result = await restoreTable(supabase, tableName, tableInfo);
      results[tableName] = result;

      if (result.error) {
        errors.push(`${tableName}: ${result.error}`);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      results[tableName] = {
        table: tableName,
        rows_restored: 0,
        checksum_verified: false,
        error: errorMsg,
      };
      errors.push(`${tableName}: ${errorMsg}`);
    }
  }

  const duration_ms = Date.now() - startTime;

  return {
    success: errors.length === 0,
    tables: results,
    duration_ms,
    errors,
  };
}

/**
 * Restore a single table from backup file
 */
async function restoreTable(
  supabase: any,
  tableName: string,
  tableInfo: any
): Promise<RestoreTableResult> {
  const { file, checksum, rows: expectedRows } = tableInfo;

  // Download backup file
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('database-backups')
    .download(file);

  if (downloadError || !fileData) {
    throw new Error(
      `Failed to download backup file: ${downloadError?.message || 'No data'}`
    );
  }

  // Read file content
  const ndjson = await fileData.text();

  // Verify checksum
  const actualChecksum = createHash('sha256').update(ndjson).digest('hex');
  const checksumMatch = actualChecksum === checksum;

  if (!checksumMatch) {
    console.warn(
      `Checksum mismatch for ${tableName}. Expected: ${checksum}, Got: ${actualChecksum}`
    );
  }

  // Parse NDJSON
  const lines = ndjson.split('\n').filter((line) => line.trim());
  const rows = lines.map((line) => JSON.parse(line));

  if (rows.length !== expectedRows) {
    console.warn(
      `Row count mismatch for ${tableName}. Expected: ${expectedRows}, Got: ${rows.length}`
    );
  }

  // Delete existing data (DANGEROUS - dev only)
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    throw new Error(`Failed to clear table: ${deleteError.message}`);
  }

  // Insert restored data in batches
  const batchSize = 100;
  let restoredCount = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error: insertError } = await supabase
      .from(tableName)
      .insert(batch);

    if (insertError) {
      throw new Error(`Failed to insert batch: ${insertError.message}`);
    }

    restoredCount += batch.length;
  }

  return {
    table: tableName,
    rows_restored: restoredCount,
    checksum_verified: checksumMatch,
  };
}

/**
 * Soft-delete restore: set deleted_at = NULL for a specific record
 * Admin-only feature to restore soft-deleted user data
 */
export async function restoreSoftDeletedRecord(
  tableName: string,
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Verify table supports soft-delete
  const validTables = [
    'projects',
    'project_snapshots',
    'cached_results',
    'exports',
    'clusters',
    'cluster_members',
    'serp_snapshots',
  ];

  if (!validTables.includes(tableName)) {
    return {
      success: false,
      error: `Table ${tableName} does not support soft-delete restore`,
    };
  }

  // Restore by setting deleted_at = NULL
  const { error } = await supabase
    .from(tableName)
    .update({ deleted_at: null })
    .eq('id', recordId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

/**
 * List soft-deleted records for a table (admin only)
 */
export async function listSoftDeletedRecords(
  tableName: string,
  limit: number = 100
): Promise<any[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Error listing soft-deleted records from ${tableName}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Permanently delete soft-deleted records older than 30 days
 */
export async function purgeOldSoftDeletes(): Promise<{
  tables: Record<string, number>;
  total_purged: number;
  errors: string[];
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const tables = [
    'projects',
    'project_snapshots',
    'cached_results',
    'exports',
    'clusters',
    'cluster_members',
    'serp_snapshots',
  ];

  const result: Record<string, number> = {};
  const errors: string[] = [];
  let totalPurged = 0;

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .not('deleted_at', 'is', null)
        .lt('deleted_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        errors.push(`${table}: ${error.message}`);
        result[table] = 0;
      } else {
        const count = data?.length || 0;
        result[table] = count;
        totalPurged += count;
      }
    } catch (error) {
      errors.push(
        `${table}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result[table] = 0;
    }
  }

  return {
    tables: result,
    total_purged: totalPurged,
    errors,
  };
}
