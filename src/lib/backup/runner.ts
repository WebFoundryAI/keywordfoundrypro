import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export interface BackupTableResult {
  table: string;
  rows: number;
  file: string;
  checksum: string;
  error?: string;
}

export interface BackupResult {
  status: 'success' | 'partial' | 'failed';
  tables: Record<string, BackupTableResult>;
  duration_ms: number;
  notes: string | null;
}

// Tables to backup (user-owned data)
const BACKUP_TABLES = [
  'profiles',
  'projects',
  'project_snapshots',
  'cached_results',
  'exports',
  'clusters',
  'cluster_members',
  'serp_snapshots',
  'runbook_docs',
] as const;

/**
 * Run a full database backup to Supabase Storage
 * Exports each table as NDJSON (newline-delimited JSON)
 * Uploads to storage bucket with compression
 */
export async function runBackup(): Promise<BackupResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const results: Record<string, BackupTableResult> = {};

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for backup');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let successCount = 0;
  let failureCount = 0;

  for (const table of BACKUP_TABLES) {
    try {
      const result = await backupTable(supabase, table, timestamp);
      results[table] = result;

      if (result.error) {
        failureCount++;
      } else {
        successCount++;
      }
    } catch (error) {
      console.error(`Error backing up table ${table}:`, error);
      results[table] = {
        table,
        rows: 0,
        file: '',
        checksum: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      failureCount++;
    }
  }

  const duration_ms = Date.now() - startTime;

  let status: 'success' | 'partial' | 'failed';
  if (failureCount === 0) {
    status = 'success';
  } else if (successCount > 0) {
    status = 'partial';
  } else {
    status = 'failed';
  }

  const notes =
    failureCount > 0
      ? `${failureCount} table(s) failed to backup`
      : null;

  // Record backup manifest
  await supabase.from('backup_manifests').insert({
    run_at: new Date().toISOString(),
    status,
    tables: results,
    duration_ms,
    notes,
  });

  return {
    status,
    tables: results,
    duration_ms,
    notes,
  };
}

/**
 * Backup a single table to storage
 */
async function backupTable(
  supabase: any,
  table: string,
  timestamp: string
): Promise<BackupTableResult> {
  // Fetch all rows from table (paginated for large tables)
  const rows: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch from ${table}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      rows.push(...data);
      from += pageSize;

      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }

  // Convert to NDJSON format
  const ndjson = rows.map((row) => JSON.stringify(row)).join('\n');

  // Calculate checksum
  const checksum = createHash('sha256').update(ndjson).digest('hex');

  // Upload to storage
  const fileName = `backups/${timestamp}/${table}.ndjson`;

  const { error: uploadError } = await supabase.storage
    .from('database-backups')
    .upload(fileName, ndjson, {
      contentType: 'application/x-ndjson',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload ${table}: ${uploadError.message}`);
  }

  return {
    table,
    rows: rows.length,
    file: fileName,
    checksum,
  };
}

/**
 * Get backup manifest by ID
 */
export async function getBackupManifest(
  manifestId: string
): Promise<any | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('backup_manifests')
    .select('*')
    .eq('id', manifestId)
    .single();

  if (error) {
    console.error('Error fetching backup manifest:', error);
    return null;
  }

  return data;
}

/**
 * List recent backup manifests
 */
export async function listBackupManifests(
  limit: number = 30
): Promise<any[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('backup_manifests')
    .select('*')
    .order('run_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error listing backup manifests:', error);
    return [];
  }

  return data || [];
}
