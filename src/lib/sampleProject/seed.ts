/**
 * FEATURE PARTIALLY DISABLED: Sample project creation without SERP snapshots
 * Creates keyword research with cached results only
 */

import { supabase } from '@/integrations/supabase/client';
import sampleData from './data/sample-keywords.json';

export interface SampleProjectResult {
  success: boolean;
  projectId?: string;
  error?: string;
}

/**
 * Check if user already has the sample project
 */
export async function hasSampleProject(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check profile flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_sample_project')
      .eq('user_id', user.id)
      .single();

    if (profile?.has_sample_project) {
      return true;
    }

    // Also check if a sample project exists in keyword_research
    const { data: existing } = await supabase
      .from('keyword_research')
      .select('id')
      .eq('user_id', user.id)
      .eq('seed_keyword', 'SAMPLE_PROJECT')
      .limit(1);

    return existing && existing.length > 0;
  } catch (error) {
    console.error('Error checking sample project:', error);
    return false;
  }
}

/**
 * Create a sample project with demo data for first-time users
 * No external API calls - uses static fixture data
 */
export async function createSampleProject(): Promise<SampleProjectResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if already exists
    const exists = await hasSampleProject();
    if (exists) {
      return { success: true, error: 'Sample project already exists' };
    }

    // Create the main research entry
    const { data: research, error: researchError } = await supabase
      .from('keyword_research')
      .insert({
        user_id: user.id,
        seed_keyword: 'SAMPLE_PROJECT',
        language_code: 'en',
        location_code: 2840,
        results_limit: sampleData.keywords.length,
        total_results: sampleData.keywords.length,
        api_cost: 0, // No cost for sample data
      })
      .select()
      .single();

    if (researchError || !research) {
      console.error('Error creating sample research:', researchError);
      return {
        success: false,
        error: researchError?.message || 'Failed to create research entry',
      };
    }

    // Create keyword_results for each keyword (not cached_results)
    const keywordResults = sampleData.keywords.map((kw) => ({
      research_id: research.id,
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      difficulty: kw.keyword_difficulty,
      cpc: kw.cpc,
      intent: kw.intent,
      metrics_source: 'sample_data',
    }));

    const { error: resultsError } = await supabase
      .from('keyword_results')
      .insert(keywordResults);

    if (resultsError) {
      console.error('Error creating keyword results:', resultsError);
      // Continue even if results fail
    }

    // Mark profile as having sample project
    await supabase
      .from('profiles')
      .update({ has_sample_project: true } as any)
      .eq('user_id', user.id);

    return {
      success: true,
      projectId: research.id,
    };
  } catch (error) {
    console.error('Error creating sample project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a project is the sample project
 */
export function isSampleProject(seedKeyword: string): boolean {
  return seedKeyword === 'SAMPLE_PROJECT';
}

/**
 * Get sample project metadata
 */
export function getSampleProjectMetadata() {
  return {
    name: sampleData.project.name,
    description: sampleData.project.description,
    keywordCount: sampleData.keywords.length,
    isDemo: true,
  };
}
