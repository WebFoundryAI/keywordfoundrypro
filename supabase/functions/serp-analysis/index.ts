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

interface SerpRequest {
  keyword: string;
  languageCode: string;
  locationCode: number;
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

    const { keyword, languageCode, locationCode }: SerpRequest = await req.json();

    console.log(`Starting SERP analysis for user ${user.id}: ${keyword}`);

    // Prepare API request for SERP data
    const apiPayload = [{
      "keyword": keyword,
      "location_code": locationCode,
      "language_code": languageCode,
      "device": "desktop",
      "os": "windows"
    }];

    console.log('SERP API Payload:', JSON.stringify(apiPayload, null, 2));

    // Call SERP API
    const serpResponse = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${apiLogin}:${apiPassword}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload)
    });

    const serpData = await serpResponse.json();
    console.log('SERP API response status:', serpResponse.status);

    if (!serpResponse.ok) {
      console.error('SERP API response error:', serpData);
      throw new Error(`SERP API request failed: ${serpResponse.status} ${serpResponse.statusText}`);
    }

    if (!serpData.tasks || serpData.tasks[0].status_code !== 20000) {
      const errorMsg = serpData.tasks?.[0]?.status_message || 'Unknown SERP API error';
      console.error('SERP API error:', errorMsg);
      throw new Error(`SERP API error: ${errorMsg}`);
    }

    // Extract organic results (non-ads, non-map entries)
    const rawResults = serpData.tasks[0].result || [];
    const serpResults = rawResults[0]?.items || [];
    
    console.log(`Received ${serpResults.length} SERP results`);
    
    // Filter and process top 10 organic results
    const organicResults = serpResults
      .filter((item: any) => 
        item.type === 'organic' && 
        !item.is_paid && 
        !item.is_featured_snippet &&
        !item.is_malicious
      )
      .slice(0, 10)
      .map((item: any, index: number) => ({
        position: index + 1,
        title: item.title || '',
        url: item.url || '',
        domain: item.domain || '',
        description: item.description || '',
        breadcrumb: item.breadcrumb || '',
        highlighted: item.highlighted || [],
        extra: {
          ad_aclk: item.extra?.ad_aclk || null,
          content_score: item.extra?.content_score || null,
          snippet: item.snippet || ''
        }
      }));

    console.log(`Processed ${organicResults.length} organic SERP results`);

    // Calculate estimated cost (SERP requests are typically $0.002 each)
    const estimatedCost = 0.002;

    return new Response(JSON.stringify({
      success: true,
      keyword: keyword,
      results: organicResults,
      total_results: organicResults.length,
      estimated_cost: estimatedCost.toFixed(3)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in serp-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});