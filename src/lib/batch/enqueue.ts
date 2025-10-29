import { createClient } from '@supabase/supabase-js';
import { KeywordRow } from './validator';

export interface BatchJob {
  id: string;
  user_id: string;
  project_id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  input_format: 'csv' | 'json';
  total: number;
  ok: number;
  failed: number;
  created_at: string;
  finished_at: string | null;
  meta: Record<string, unknown> | null;
}

/**
 * Create a new batch job
 */
export async function createBatchJob(
  userId: string,
  projectId: string,
  inputFormat: 'csv' | 'json',
  totalRows: number,
  meta?: Record<string, unknown>
): Promise<{ jobId: string | null; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('batch_jobs')
    .insert({
      user_id: userId,
      project_id: projectId,
      status: 'pending',
      input_format: inputFormat,
      total: totalRows,
      ok: 0,
      failed: 0,
      meta: meta || null,
    })
    .select()
    .single();

  if (error) {
    return { jobId: null, error: error.message };
  }

  return { jobId: data.id, error: null };
}

/**
 * Update batch job progress
 */
export async function updateBatchJobProgress(
  jobId: string,
  ok: number,
  failed: number,
  status: 'pending' | 'running' | 'done' | 'error' = 'running'
): Promise<{ success: boolean; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const updates: Record<string, unknown> = {
    ok,
    failed,
    status,
  };

  if (status === 'done' || status === 'error') {
    updates.finished_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('batch_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get batch job status
 */
export async function getBatchJobStatus(
  jobId: string
): Promise<{ job: BatchJob | null; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    return { job: null, error: error.message };
  }

  return { job: data as BatchJob, error: null };
}

/**
 * ISSUE FIX #3 & #6: Optimized batch processing with chunking for large lists
 *
 * Process batch job rows with the following optimizations:
 * - Chunking: Process in batches of 50 keywords to avoid timeout
 * - Deduplication: Remove duplicate keywords before processing
 * - Rate limiting: Add delays between chunks to avoid API throttling
 * - Memory optimization: Process and release chunks to avoid memory leaks
 * - Parallel processing: Process multiple keywords in parallel within each chunk
 *
 * @param jobId - Batch job ID
 * @param projectId - Project ID
 * @param rows - Array of keyword rows to process
 * @returns Processing result with success status
 */
export async function processBatchJob(
  jobId: string,
  projectId: string,
  rows: KeywordRow[]
): Promise<{ success: boolean; error: string | null }> {
  const CHUNK_SIZE = 50; // Process 50 keywords at a time
  const PARALLEL_LIMIT = 5; // Process 5 keywords in parallel
  const CHUNK_DELAY_MS = 2000; // 2 second delay between chunks

  // Update status to running
  await updateBatchJobProgress(jobId, 0, 0, 'running');

  // Deduplicate keywords (case-insensitive)
  const normalizeKeyword = (kw: string) => kw.toLowerCase().trim();
  const seenKeywords = new Set<string>();
  const uniqueRows: KeywordRow[] = [];

  for (const row of rows) {
    const normalized = normalizeKeyword(row.keyword);
    if (!seenKeywords.has(normalized)) {
      seenKeywords.add(normalized);
      uniqueRows.push(row);
    }
  }

  console.log(`Deduplicated ${rows.length} rows to ${uniqueRows.length} unique keywords`);

  let okCount = 0;
  let failedCount = 0;

  // Split into chunks
  for (let i = 0; i < uniqueRows.length; i += CHUNK_SIZE) {
    const chunk = uniqueRows.slice(i, i + CHUNK_SIZE);
    console.log(`Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(uniqueRows.length / CHUNK_SIZE)}`);

    // Process keywords in parallel (with limit)
    const chunkPromises: Promise<void>[] = [];

    for (let j = 0; j < chunk.length; j += PARALLEL_LIMIT) {
      const batch = chunk.slice(j, j + PARALLEL_LIMIT);

      const batchPromise = Promise.all(
        batch.map(async (row) => {
          try {
            // TODO: Replace with actual API call to keyword research endpoint
            // Example: await invokeFunction('keyword-research', {
            //   keyword: row.keyword,
            //   languageCode: row.language || 'en',
            //   locationCode: getLocationCode(row.country) || 2840
            // });

            // Simulate API call delay (remove in production)
            await new Promise(resolve => setTimeout(resolve, 100));
            okCount++;
          } catch (error) {
            failedCount++;
            console.error(`Failed to process keyword: ${row.keyword}`, error);
          }
        })
      );

      chunkPromises.push(batchPromise);
    }

    // Wait for all parallel batches in this chunk to complete
    await Promise.all(chunkPromises);

    // Update progress after each chunk
    await updateBatchJobProgress(jobId, okCount, failedCount, 'running');

    // Add delay between chunks to avoid rate limiting (except for last chunk)
    if (i + CHUNK_SIZE < uniqueRows.length) {
      console.log(`Waiting ${CHUNK_DELAY_MS}ms before next chunk...`);
      await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
    }
  }

  // Mark as done
  await updateBatchJobProgress(jobId, okCount, failedCount, 'done');

  console.log(`Batch job ${jobId} completed: ${okCount} success, ${failedCount} failed`);
  return { success: true, error: null };
}

/**
 * Get all batch jobs for a user
 */
export async function getUserBatchJobs(
  userId: string,
  limit: number = 50
): Promise<{ jobs: BatchJob[]; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { jobs: [], error: error.message };
  }

  return { jobs: data as BatchJob[], error: null };
}
