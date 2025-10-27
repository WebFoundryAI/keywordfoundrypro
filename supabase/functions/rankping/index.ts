// Edge Function for daily rank checking
// Runs via cron at 03:00 UTC daily

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RankCheckResult {
  projectId: string;
  success: boolean;
  checked: number;
  errors: string[];
}

async function runRankCheckForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<RankCheckResult> {
  try {
    // Get rank settings
    const { data: settings, error: settingsError } = await supabase
      .from('rank_settings')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (settingsError || !settings || !settings.enabled) {
      return {
        projectId,
        success: true,
        checked: 0,
        errors: settings ? [] : ['Settings not found'],
      };
    }

    // Get keywords to check
    const { data: keywords } = await supabase
      .from('cached_results')
      .select('keyword')
      .eq('project_id', projectId)
      .order('volume', { ascending: false })
      .limit(settings.daily_quota);

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
  }
}

serve(async (req) => {
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

    const results: RankCheckResult[] = [];

    // Process each project
    for (const setting of settings) {
      const result = await runRankCheckForProject(supabase, setting.project_id);
      results.push(result);
    }

    const totalChecked = results.reduce((sum, r) => sum + r.checked, 0);
    const failures = results.filter((r) => !r.success);

    return new Response(
      JSON.stringify({
        success: true,
        projects_processed: results.length,
        total_keywords_checked: totalChecked,
        failures: failures.length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rank ping error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
