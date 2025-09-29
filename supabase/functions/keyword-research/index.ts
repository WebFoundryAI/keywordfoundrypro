import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// API credentials
const apiLogin = Deno.env.get('DATAFORSEO_LOGIN');
const apiPassword = Deno.env.get('DATAFORSEO_PASSWORD');

interface KeywordRequest {
  keyword: string;
  languageCode: string;
  locationCode: number;
  limit: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { keyword, languageCode, locationCode, limit }: KeywordRequest = await req.json();

    console.log(`Starting keyword research for user ${user.id}: ${keyword}`);

    // Create research record
    const { data: research, error: researchError } = await supabase
      .from('keyword_research')
      .insert({
        user_id: user.id,
        seed_keyword: keyword,
        language_code: languageCode,
        location_code: locationCode,
        results_limit: limit
      })
      .select()
      .single();

    if (researchError) {
      console.error('Error creating research record:', researchError);
      throw new Error('Failed to create research record');
    }

    // Prepare API request - FIXED: Use correct field name
    const apiPayload = [{
      "keywords": [keyword],  // Changed from "keyword" to "keywords" array
      "location_code": locationCode,
      "language_code": languageCode,
      "limit": limit,
      "include_serp_info": false,
      "include_clickstream_data": false
    }];

    console.log('API Payload:', JSON.stringify(apiPayload, null, 2));

    // Call keyword research API for ideas
    const keywordIdeasResponse = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${apiLogin}:${apiPassword}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload)
    });

    const keywordIdeasData = await keywordIdeasResponse.json();
    console.log('Keyword ideas API response status:', keywordIdeasResponse.status);

    if (!keywordIdeasResponse.ok) {
      console.error('API response error:', keywordIdeasData);
      throw new Error(`API request failed: ${keywordIdeasResponse.status} ${keywordIdeasResponse.statusText}`);
    }

    if (!keywordIdeasData.tasks || keywordIdeasData.tasks[0].status_code !== 20000) {
      const errorMsg = keywordIdeasData.tasks?.[0]?.status_message || 'Unknown API error';
      console.error('API error:', errorMsg);
      throw new Error(`API error: ${errorMsg}`);
    }

    // DataForSEO Labs returns results nested in items array
    const rawResults = keywordIdeasData.tasks[0].result || [];
    const keywordResults = rawResults[0]?.items || [];
    
    console.log(`Received ${keywordResults.length} keyword results`);
    console.log('Sample result structure:', JSON.stringify(keywordResults[0], null, 2));
    
    // Process and categorize keywords
    const processedResults = keywordResults.map((item: any, index: number) => {
      // Extract data from the correct structure
      const keywordData = item.keyword_info || {};
      const keywordText = item.keyword || keyword;
      const searchVolume = keywordData.search_volume || 0;
      const cpc = keywordData.cpc || 0;
      const competition = keywordData.competition || 0;
      const keywordDifficulty = item.keyword_properties?.keyword_difficulty || 0;
      
      // Determine intent based on keyword patterns
      let intent = 'informational';
      const keyword_text = keywordText.toLowerCase();
      
      if (keyword_text.includes('buy') || keyword_text.includes('purchase') || keyword_text.includes('order') || keyword_text.includes('shop')) {
        intent = 'transactional';
      } else if (keyword_text.includes('best') || keyword_text.includes('top') || keyword_text.includes('review') || keyword_text.includes('compare')) {
        intent = 'commercial';
      } else if (keyword_text.includes('near me') || keyword_text.includes('location') || keyword_text.includes('where')) {
        intent = 'navigational';
      }

      // Use DataForSEO's keyword difficulty if available, otherwise calculate from competition
      const difficulty = keywordDifficulty || Math.min(100, Math.floor(competition * 100 + (searchVolume > 10000 ? 20 : 0)));

      return {
        research_id: research.id,
        keyword: keywordText,
        search_volume: searchVolume,
        cpc: cpc,
        intent: intent,
        difficulty: difficulty,
        cluster_id: `cluster_${Math.floor(index / 10) + 1}`,
        metrics_source: 'dataforseo_labs'
      };
    });

    // Store results in database
    if (processedResults.length > 0) {
      const { error: resultsError } = await supabase
        .from('keyword_results')
        .insert(processedResults);

      if (resultsError) {
        console.error('Error storing keyword results:', resultsError);
        throw new Error('Failed to store keyword results');
      }
    }

    // Update research record with total results and estimated cost
    const estimatedCost = Math.ceil(limit / 100) * 0.01;
    const { error: updateError } = await supabase
      .from('keyword_research')
      .update({
        total_results: processedResults.length,
        api_cost: estimatedCost
      })
      .eq('id', research.id);

    if (updateError) {
      console.error('Error updating research record:', updateError);
    }

    console.log(`Completed keyword research: ${processedResults.length} keywords found`);

    return new Response(JSON.stringify({
      success: true,
      research_id: research.id,
      results: processedResults,
      total_results: processedResults.length,
      estimated_cost: estimatedCost.toFixed(2)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in keyword-research function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});