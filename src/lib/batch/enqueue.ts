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
 * Process batch job rows (placeholder for actual processing)
 * In production, this would call the keyword research API
 */
export async function processBatchJob(
  jobId: string,
  projectId: string,
  rows: KeywordRow[]
): Promise<{ success: boolean; error: string | null }> {
  // Update status to running
  await updateBatchJobProgress(jobId, 0, 0, 'running');

  let okCount = 0;
  let failedCount = 0;

  // Simulate processing (in production, call actual API)
  for (const row of rows) {
    try {
      // TODO: Call keyword research API with row.keyword, row.country, row.language
      // For now, just simulate success
      okCount++;

      // Update progress every 10 rows
      if (okCount % 10 === 0) {
        await updateBatchJobProgress(jobId, okCount, failedCount, 'running');
      }
    } catch (error) {
      failedCount++;
      console.error(`Failed to process keyword: ${row.keyword}`, error);
    }
  }

  // Mark as done
  await updateBatchJobProgress(jobId, okCount, failedCount, 'done');

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
