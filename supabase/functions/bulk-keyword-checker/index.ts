import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkCheckRequest {
  keywords: string[];
  location: string;
  language: string;
  sandbox?: boolean;
}

// Location code mapping
const LOCATION_MAP: Record<string, number> = {
  "United Kingdom": 2826,
  "United States": 2840,
  "Canada": 2124,
  "Australia": 2036,
  "Germany": 2276,
  "France": 2250,
  "Spain": 2724
};

// Language code mapping
const LANGUAGE_MAP: Record<string, string> = {
  "English": "en",
  "Spanish": "es",
  "French": "fr",
  "German": "de"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Bulk Keyword Checker Function Invoked ===');
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const body: BulkCheckRequest = await req.json();
    const { keywords, location, language, sandbox = false } = body;

    // Validate input
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Keywords array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (keywords.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Maximum 50 keywords allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map location and language to codes
    const locationCode = LOCATION_MAP[location] || 2826; // Default to UK
    const languageCode = LANGUAGE_MAP[language] || 'en'; // Default to English

    console.log('Mapped codes:', { location, locationCode, language, languageCode });

    // Get DataForSEO credentials
    const dataForSeoLogin = Deno.env.get('DATAFORSEO_LOGIN');
    const dataForSeoPassword = Deno.env.get('DATAFORSEO_PASSWORD');

    if (!dataForSeoLogin || !dataForSeoPassword) {
      console.error('DataForSEO credentials not configured');
      throw new Error('API credentials not configured');
    }

    // Prepare DataForSEO API request
    const endpoint = sandbox 
      ? 'https://sandbox.dataforseo.com/v3/keywords_data/google_ads/search_volume/live'
      : 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';

    const payload = [{
      keywords: keywords,
      location_code: locationCode,
      language_code: languageCode
    }];

    console.log('Calling DataForSEO API:', { endpoint, keywordCount: keywords.length, locationCode, languageCode });

    // Make API request to DataForSEO
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${dataForSeoLogin}:${dataForSeoPassword}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('DataForSEO API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const apiData = await response.json();
    console.log('DataForSEO response received');

    // Check for API errors
    if (apiData.status_code !== 20000) {
      console.error('DataForSEO API returned error:', apiData);
      throw new Error(apiData.status_message || 'DataForSEO API error');
    }

    // Extract and format results from DataForSEO response
    // Response structure: tasks[0].result is an array of keyword objects
    const results = apiData.tasks?.[0]?.result || [];
    
    console.log(`Raw results count: ${results.length}`);
    
    const formattedResults = results.map((item: any) => ({
      keyword: item.keyword || '',
      search_volume: item.search_volume || 0,
      competition_index: item.competition_index || 0,
      competition: item.competition || 'UNKNOWN',
      low_top_of_page_bid: item.low_top_of_page_bid || 0,
      high_top_of_page_bid: item.high_top_of_page_bid || 0,
      monthly_searches: item.monthly_searches || []
    }));

    console.log(`Processed ${formattedResults.length} keyword results`);

    // Log API usage to database
    try {
      const cost = apiData.tasks?.[0]?.cost || 0;
      await supabase
        .from('dataforseo_usage')
        .insert({
          user_id: user.id,
          module: 'keywords_data',
          endpoint: '/v3/keywords_data/google_ads/search_volume/live',
          cost_usd: cost,
          response_status: apiData.status_code,
          request_payload: payload
        });
    } catch (logError) {
      console.error('Failed to log API usage:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: formattedResults,
        total_keywords: formattedResults.length,
        cost: apiData.tasks?.[0]?.cost || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err: any) {
    console.error('Bulk checker error:', err);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
