import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DataForSEO credentials
const dataForSeoLogin = Deno.env.get('DATAFORSEO_LOGIN');
const dataForSeoPassword = Deno.env.get('DATAFORSEO_PASSWORD');

interface SuggestionsRequest {
  keyword: string;
  languageCode?: string;
  locationCode?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, languageCode = 'en', locationCode = 2840 }: SuggestionsRequest = await req.json();

    if (!keyword || keyword.trim().length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Keyword must be at least 2 characters long'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Getting keyword suggestions for: ${keyword}`);

    // Prepare DataForSEO API request for keyword suggestions
    const dataForSeoPayload = [{
      "language_code": languageCode,
      "location_code": locationCode,
      "keyword": keyword.trim(),
      "limit": 10
    }];

    // Call DataForSEO Labs API for keyword suggestions
    const suggestionsResponse = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${dataForSeoLogin}:${dataForSeoPassword}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataForSeoPayload)
    });

    const suggestionsData = await suggestionsResponse.json();
    console.log('DataForSEO suggestions response received');

    if (!suggestionsData.tasks || suggestionsData.tasks[0].status_code !== 20000) {
      throw new Error(`DataForSEO API error: ${suggestionsData.tasks?.[0]?.status_message || 'Unknown error'}`);
    }

    const suggestions = suggestionsData.tasks[0].result || [];
    
    // Process suggestions
    const processedSuggestions = suggestions.map((item: any) => {
      const keywordData = item.keyword_info || {};
      return {
        keyword: keywordData.keyword || '',
        search_volume: keywordData.search_volume || 0,
        cpc: keywordData.cpc || 0,
        competition: keywordData.competition || 0
      };
    }).filter((suggestion: any) => suggestion.keyword.length > 0);

    console.log(`Found ${processedSuggestions.length} keyword suggestions`);

    return new Response(JSON.stringify({
      success: true,
      suggestions: processedSuggestions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in keyword-suggestions function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});