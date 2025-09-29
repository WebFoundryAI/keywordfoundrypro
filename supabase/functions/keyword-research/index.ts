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

// Keyword research API credentials
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

    // Prepare API request
    const apiPayload = [{
      "language_code": languageCode,
      "location_code": locationCode,
      "keyword": keyword,
      "limit": limit
    }];

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
    console.log('Keyword ideas response received');

    if (!keywordIdeasData.tasks || keywordIdeasData.tasks[0].status_code !== 20000) {
      throw new Error(`API error: ${keywordIdeasData.tasks?.[0]?.status_message || 'Unknown error'}`);
    }

    const keywordResults = keywordIdeasData.tasks[0].result || [];
    
    // Process and categorize keywords
    const processedResults = keywordResults.map((item: any, index: number) => {
      const keywordData = item.keyword_info || {};
      const searchVolume = keywordData.search_volume || 0;
      const cpc = keywordData.cpc || 0;
      
      // Determine intent based on keyword patterns
      let intent = 'informational';
      const keyword_text = keywordData.keyword?.toLowerCase() || '';
      
      if (keyword_text.includes('buy') || keyword_text.includes('purchase') || keyword_text.includes('order')) {
        intent = 'transactional';
      } else if (keyword_text.includes('best') || keyword_text.includes('top') || keyword_text.includes('review')) {
        intent = 'commercial';
      } else if (keyword_text.includes('near me') || keyword_text.includes('location')) {
        intent = 'navigational';
      }

      // Calculate difficulty score (0-100) based on competition and search volume
      const competition = keywordData.competition || 0;
      const difficulty = Math.min(100, Math.floor(competition * 100 + (searchVolume > 10000 ? 20 : 0)));

      return {
        research_id: research.id,
        keyword: keywordData.keyword || keyword,
        search_volume: searchVolume,
        cpc: cpc,
        intent: intent,
        difficulty: difficulty,
        cluster_id: `cluster_${Math.floor(index / 10) + 1}`,
        metrics_source: 'keyword_research_api'
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
      estimated_cost: estimatedCost
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