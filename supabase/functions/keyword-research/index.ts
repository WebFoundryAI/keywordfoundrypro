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
    let keywordResults = rawResults[0]?.items || [];
    
    console.log(`Received ${keywordResults.length} keyword results from initial request`);
    console.log('Initial endpoint used: /v3/dataforseo_labs/google/keyword_ideas/live');
    
    // Check if seed keyword is in the results
    const seedKeywordInResults = keywordResults.some((item: any) => 
      (item.keyword || '').toLowerCase() === keyword.toLowerCase()
    );
    
    let fallbackAttempted = false;
    let fallbackSuccessful = false;
    
    // If seed keyword not found, perform ONE fallback lookup using keyword_overview endpoint
    if (!seedKeywordInResults && keywordResults.length > 0) {
      console.log(`Seed keyword "${keyword}" not found in initial results. Attempting fallback lookup...`);
      fallbackAttempted = true;
      
      try {
        // Use keyword_overview endpoint with SAME parameters as main request for consistency
        const fallbackPayload = [{
          "keywords": [keyword],  // keyword_overview expects keywords array
          "location_code": locationCode,
          "language_code": languageCode,
          "include_serp_info": false,
          "include_clickstream_data": false
        }];
        
        const fallbackResponse = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${apiLogin}:${apiPassword}`)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fallbackPayload)
        });
        
        const fallbackData = await fallbackResponse.json();
        console.log('Fallback lookup response status:', fallbackResponse.status);
        console.log('Fallback endpoint used: /v3/dataforseo_labs/google/keyword_overview/live');
        
        if (fallbackResponse.ok && fallbackData.tasks?.[0]?.status_code === 20000) {
          const fallbackResults = fallbackData.tasks[0].result?.[0]?.items || [];
          const exactMatch = fallbackResults.find((item: any) => 
            (item.keyword || '').toLowerCase() === keyword.toLowerCase()
          );
          
          if (exactMatch) {
            console.log(`Fallback successful: Found seed keyword with metrics`);
            fallbackSuccessful = true;
            // Add the exact match to the beginning of results
            keywordResults = [exactMatch, ...keywordResults];
          } else {
            console.log(`Fallback completed but no exact match found for "${keyword}"`);
          }
        } else {
          console.log(`Fallback request failed or returned error status`);
        }
      } catch (fallbackError) {
        console.error('Fallback lookup error (non-critical):', fallbackError);
      }
    } else if (seedKeywordInResults) {
      console.log(`Seed keyword "${keyword}" found in initial results`);
    }
    
    console.log('Sample result structure:', JSON.stringify(keywordResults[0], null, 2));
    
    // Process and categorize keywords
    const processedResults = keywordResults.map((item: any, index: number) => {
      // Extract data from the correct structure
      const keywordData = item.keyword_info || {};
      const keywordText = item.keyword || keyword;
      
      // Use ?? null to preserve 0 values from API, only default null/undefined
      const searchVolume = keywordData.search_volume ?? null;
      const cpc = keywordData.cpc ?? null;
      const competition = keywordData.competition ?? 0;
      const keywordDifficulty = item.keyword_properties?.keyword_difficulty ?? null;
      
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
      // Only calculate if we have valid search volume, otherwise keep null
      let difficulty = keywordDifficulty;
      if (difficulty === null && searchVolume !== null) {
        difficulty = Math.min(100, Math.floor(competition * 100 + (searchVolume > 10000 ? 20 : 0)));
      }

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

    // Ensure seed keyword appears first by sorting
    processedResults.sort((a: any, b: any) => {
      if (a.keyword.toLowerCase() === keyword.toLowerCase()) return -1;
      if (b.keyword.toLowerCase() === keyword.toLowerCase()) return 1;
      return 0;
    });
    
    // If seed keyword still not in results after fallback, add with safe defaults
    const seedKeywordExists = processedResults.some((r: any) => 
      r.keyword.toLowerCase() === keyword.toLowerCase()
    );
    
    if (!seedKeywordExists) {
      console.log(`Adding seed keyword "${keyword}" with safe defaults (no metrics available)`);
      processedResults.unshift({
        research_id: research.id,
        keyword: keyword,
        search_volume: null, // null means no data available
        cpc: null, // null means no data available
        intent: 'informational',
        difficulty: null, // null will display as "—" in UI
        cluster_id: 'cluster_seed',
        metrics_source: 'dataforseo_labs'
      });
    }

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
    
    // Prepare response metadata
    const responseMetadata: any = {
      success: true,
      research_id: research.id,
      results: processedResults,
      total_results: processedResults.length,
      estimated_cost: estimatedCost.toFixed(2),
      fallback_attempted: fallbackAttempted,
      fallback_successful: fallbackSuccessful
    };
    
    // Add note if seed keyword has no metrics (null means no data, 0 is valid)
    const seedResult = processedResults.find((r: any) => 
      r.keyword.toLowerCase() === keyword.toLowerCase()
    );
    if (seedResult && seedResult.search_volume === null && seedResult.difficulty === null) {
      responseMetadata.seed_keyword_note = 'No metrics returned by DataForSEO for this term.';
    }

    return new Response(JSON.stringify(responseMetadata), {
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