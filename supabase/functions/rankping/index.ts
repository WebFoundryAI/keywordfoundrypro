/**
 * ISSUE FIX #7: Memory leak fixes for background worker
 *
 * Edge Function for daily rank checking with memory optimizations:
 * - Processes projects in chunks to avoid memory buildup
 * - Streams results instead of accumulating in memory
 * - Explicitly releases large data structures
 * - Limits concurrent operations
 * - Adds timeout protection
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RankCheckResult {
  projectId: string;
  success: boolean;
  checked: number;
  errors: string[];
}

interface RankCheckSummary {
  success: boolean;
  checked: number;
  failed: number;
}

async function runRankCheckForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<RankCheckResult> {
  let keywords: any[] | null = null;
  let settings: any = null;

  try {
    // Get rank settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('rank_settings')
      .select('*')
      .eq('project_id', projectId)
      .single();

    settings = settingsData;

    if (settingsError || !settings || !settings.enabled) {
      return {
        projectId,
        success: true,
        checked: 0,
        errors: settings ? [] : ['Settings not found'],
      };
    }

    // Get keywords to check (limited by daily quota)
    const { data: keywordsData } = await supabase
      .from('cached_results')
      .select('keyword')
      .eq('project_id', projectId)
      .order('volume', { ascending: false })
      .limit(settings.daily_quota);

    keywords = keywordsData;

    if (!keywords || keywords.length === 0) {
      return {
        projectId,
        success: true,
        checked: 0,
        errors: [],
      };
    }

    const checkedCount = 0;
    const errors: string[] = [];

    // In production, this would call DataForSEO API
    // For now, we'll just log the intent
    console.log(`Would check ${keywords.length} keywords for project ${projectId}`);

    // Update settings
    await supabase
      .from('rank_settings')
      .update({
        last_run_at: new Date().toISOString(),
        keywords_checked_today: checkedCount,
      })
      .eq('project_id', projectId);

    return {
      projectId,
      success: true,
      checked: checkedCount,
      errors,
    };
  } catch (error) {
    return {
      projectId,
      success: false,
      checked: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  } finally {
    // MEMORY FIX: Explicitly release large data structures
    keywords = null;
    settings = null;
  }
}

serve(async (req) => {
  const CHUNK_SIZE = 10; // Process 10 projects at a time to avoid memory buildup
  const MAX_EXECUTION_TIME = 5 * 60 * 1000; // 5 minutes timeout
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all projects with rank checking enabled
    const { data: settings, error } = await supabase
      .from('rank_settings')
      .select('project_id')
      .eq('enabled', true);

    if (error || !settings) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rank settings' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // MEMORY FIX: Use streaming summary instead of accumulating all results
    let projectsProcessed = 0;
    let totalChecked = 0;
    let totalFailed = 0;

    // MEMORY FIX: Process projects in chunks to avoid memory accumulation
    for (let i = 0; i < settings.length; i += CHUNK_SIZE) {
      // Check timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.warn(`Timeout reached after processing ${projectsProcessed} projects`);
        break;
      }

      const chunk = settings.slice(i, i + CHUNK_SIZE);
      console.log(`Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(settings.length / CHUNK_SIZE)}`);

      // Process chunk in parallel with limited concurrency
      const chunkResults = await Promise.all(
        chunk.map(setting => runRankCheckForProject(supabase, setting.project_id))
      );

      // Update summary counters (don't store full results)
      for (const result of chunkResults) {
        projectsProcessed++;
        totalChecked += result.checked;
        if (!result.success) {
          totalFailed++;
          console.error(`Failed to check project ${result.projectId}:`, result.errors);
        }
      }

      // MEMORY FIX: Explicitly clear chunk results before next iteration
      chunkResults.length = 0;

      // Small delay between chunks to avoid overwhelming the database
      if (i + CHUNK_SIZE < settings.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        projects_processed: projectsProcessed,
        total_keywords_checked: totalChecked,
        failures: totalFailed,
        execution_time_ms: Date.now() - startTime,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rank ping error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal error',
        execution_time_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
