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

interface RelatedKeywordsRequest {
  keyword: string;
  languageCode?: string;
  locationCode?: number;
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

    const { keyword, languageCode = 'en', locationCode = 2840 }: RelatedKeywordsRequest = await req.json();

    console.log(`Getting related keywords for: ${keyword}`);

    // Prepare API request for related keywords
    const apiPayload = [{
      "keywords": [keyword],
      "location_code": locationCode,
      "language_code": languageCode,
      "limit": 20,
      "include_serp_info": false,
      "include_clickstream_data": false,
      "filters": [
        ["search_volume", ">", 100] // Only keywords with decent search volume
      ]
    }];

    console.log('API Payload:', JSON.stringify(apiPayload, null, 2));

    // Call DataForSEO keyword ideas API
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${apiLogin}:${apiPassword}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload)
    });

    const data = await response.json();
    console.log('API response status:', response.status);

    if (!response.ok) {
      console.error('API response error:', data);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    if (!data.tasks || data.tasks[0].status_code !== 20000) {
      const errorMsg = data.tasks?.[0]?.status_message || 'Unknown API error';
      console.error('API error:', errorMsg);
      throw new Error(`API error: ${errorMsg}`);
    }

    // Extract related keywords
    const rawResults = data.tasks[0].result || [];
    const keywordResults = rawResults[0]?.items || [];
    
    console.log(`Received ${keywordResults.length} related keywords`);
    
    // Process and filter related keywords
    const relatedKeywords = keywordResults
      .filter((item: any) => {
        const itemKeyword = item.keyword?.toLowerCase() || '';
        const searchKeyword = keyword.toLowerCase();
        // Exclude exact match and very similar keywords
        return itemKeyword !== searchKeyword && !itemKeyword.includes(searchKeyword);
      })
      .map((item: any) => {
        const keywordData = item.keyword_info || {};
        return {
          keyword: item.keyword || '',
          search_volume: keywordData.search_volume || 0,
          cpc: keywordData.cpc || 0,
          competition: keywordData.competition || 0,
          difficulty: item.keyword_properties?.keyword_difficulty || 0,
          intent: determineIntent(item.keyword || '')
        };
      })
      .sort((a: any, b: any) => b.search_volume - a.search_volume) // Sort by search volume
      .slice(0, 20); // Get top 20

    console.log(`Processed ${relatedKeywords.length} related keywords`);

    return new Response(JSON.stringify({
      success: true,
      seed_keyword: keyword,
      related_keywords: relatedKeywords,
      total_found: relatedKeywords.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in related-keywords function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function determineIntent(keyword: string): string {
  const keywordLower = keyword.toLowerCase();
  
  if (keywordLower.includes('buy') || keywordLower.includes('purchase') || keywordLower.includes('order') || keywordLower.includes('shop')) {
    return 'transactional';
  } else if (keywordLower.includes('best') || keywordLower.includes('top') || keywordLower.includes('review') || keywordLower.includes('compare')) {
    return 'commercial';
  } else if (keywordLower.includes('near me') || keywordLower.includes('location') || keywordLower.includes('where')) {
    return 'navigational';
  }
  
  return 'informational';
}