import { createClient } from '@supabase/supabase-js';
import { mapSerpToRanks } from './normalize';

export interface RankCheckConfig {
  project_id: string;
  keywords: string[];
  domain: string;
  location: string;
  device: 'desktop' | 'mobile';
  engine: 'google';
}

export interface RankCheckResult {
  keyword: string;
  position: number | null;
  url: string | null;
  checked_at: string;
  success: boolean;
  error?: string;
}

/**
 * Check rank for a single keyword
 */
async function checkKeywordRank(
  keyword: string,
  domain: string,
  location: string,
  device: string,
  engine: string
): Promise<RankCheckResult> {
  try {
    // This would call DataForSEO SERP API
    // For now, return a mock result
    // In production, use the DataForSEO client from Day 1

    // Mock API call
    const mockSerpResponse = {
      items: [
        {
          type: 'organic',
          rank_absolute: Math.floor(Math.random() * 100) + 1,
          url: `https://${domain}/page`,
          domain: domain,
        },
      ],
    };

    const rankResult = mapSerpToRanks(mockSerpResponse, domain);

    return {
      keyword,
      position: rankResult.position,
      url: rankResult.url,
      checked_at: new Date().toISOString(),
      success: true,
    };
  } catch (error) {
    return {
      keyword,
      position: null,
      url: null,
      checked_at: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run rank checks for a project with quota management
 */
export async function runRankChecks(
  projectId: string
): Promise<{ success: boolean; checked: number; errors: string[] }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get rank settings
  const { data: settings, error: settingsError } = await supabase
    .from('rank_settings')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (settingsError || !settings) {
    return { success: false, checked: 0, errors: ['Rank settings not found'] };
  }

  if (!settings.enabled) {
    return { success: true, checked: 0, errors: ['Rank checking disabled'] };
  }

  // Get project and domain
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, domain')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { success: false, checked: 0, errors: ['Project not found'] };
  }

  // Get keywords from cached_results (top keywords by volume)
  const { data: keywords, error: keywordsError } = await supabase
    .from('cached_results')
    .select('keyword')
    .eq('project_id', projectId)
    .order('volume', { ascending: false })
    .limit(settings.daily_quota);

  if (keywordsError || !keywords || keywords.length === 0) {
    return { success: true, checked: 0, errors: ['No keywords to check'] };
  }

  const errors: string[] = [];
  let checkedCount = 0;

  // Check each keyword up to quota
  for (const { keyword } of keywords) {
    if (checkedCount >= settings.daily_quota) {
      break;
    }

    const result = await checkKeywordRank(
      keyword,
      project.domain || 'example.com',
      'United States',
      'desktop',
      'google'
    );

    if (result.success) {
      // Store rank check result
      await supabase.from('rank_checks').insert({
        project_id: projectId,
        keyword_text: result.keyword,
        engine: 'google',
        location: 'United States',
        device: 'desktop',
        position: result.position,
        url: result.url,
        checked_at: result.checked_at,
      });

      checkedCount++;
    } else {
      errors.push(`${result.keyword}: ${result.error || 'Unknown error'}`);
    }
  }

  // Update rank settings
  await supabase
    .from('rank_settings')
    .update({
      last_run_at: new Date().toISOString(),
      keywords_checked_today: checkedCount,
    })
    .eq('project_id', projectId);

  return {
    success: errors.length === 0,
    checked: checkedCount,
    errors,
  };
}

/**
 * Get rank history for a keyword
 */
export async function getRankHistory(
  projectId: string,
  keyword: string,
  days: number = 30
): Promise<any[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const { data, error } = await supabase
    .from('rank_checks')
    .select('*')
    .eq('project_id', projectId)
    .eq('keyword_text', keyword)
    .gte('checked_at', sinceDate.toISOString())
    .order('checked_at', { ascending: true });

  if (error) {
    console.error('Error fetching rank history:', error);
    return [];
  }

  return data || [];
}
