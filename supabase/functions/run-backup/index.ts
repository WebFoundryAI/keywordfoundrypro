import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  'keyword_research',
  'subscription_plans',
  'user_subscriptions',
  'user_roles',
] as const;

interface BackupTableResult {
  table: string;
  rows: number;
  file: string;
  checksum: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({
          error: 'Configuration error: Missing required environment variables',
          status: 'failed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Create Supabase client
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to initialize database connection',
          status: 'failed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        }
      );
    }

    // Health check - test database connectivity
    try {
      const { error: healthError } = await supabase
        .from('backup_manifests')
        .select('id')
        .limit(1);
      
      if (healthError && healthError.message.includes('relation') === false) {
        // Database exists but table might not - that's okay during rebuild
        console.warn('Database health check warning:', healthError.message);
      }
    } catch (error) {
      console.error('Database is unavailable:', error);
      return new Response(
        JSON.stringify({
          error: 'Database is currently unavailable. This is expected during database rebuild.',
          status: 'unavailable',
          message: 'The backup function will work once the database is restored.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        }
      );
    }

    console.log('Starting database backup...');
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const results: Record<string, BackupTableResult> = {};

    let successCount = 0;
    let failureCount = 0;

    // Backup each table
    for (const table of BACKUP_TABLES) {
      try {
        console.log(`Backing up table: ${table}`);
        const result = await backupTable(supabase, table, timestamp);
        results[table] = result;

        if (result.error) {
          failureCount++;
          console.error(`Failed to backup ${table}:`, result.error);
        } else {
          successCount++;
          console.log(`✓ Backed up ${table}: ${result.rows} rows`);
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

    const notes = failureCount > 0 ? `${failureCount} table(s) failed to backup` : null;

    // Record backup manifest
    await supabase.from('backup_manifests').insert({
      run_at: new Date().toISOString(),
      status,
      tables: results,
      duration_ms,
      notes,
    });

    console.log(`Backup completed: ${status} (${duration_ms}ms)`);

    return new Response(
      JSON.stringify({
        status,
        tables: results,
        duration_ms,
        notes,
        timestamp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Backup failed:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

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
  const encoder = new TextEncoder();
  const data = encoder.encode(ndjson);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const checksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

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
