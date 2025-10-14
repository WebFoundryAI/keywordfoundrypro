import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Allowed origins for CORS
const allowedOrigins = [
  'https://vhjffdzroebdkbmvcpgv.supabase.co',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://lovable.app',
  'https://lovable.dev'
];

// Dynamic CORS headers based on request origin
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed) || origin.endsWith('.lovable.app') || origin.endsWith('.lovable.dev')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Initialize Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Admin client for JWT verification only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// API credentials
const apiLogin = Deno.env.get('DATAFORSEO_LOGIN');
const apiPassword = Deno.env.get('DATAFORSEO_PASSWORD');

// Input validation schema
const KeywordRequestSchema = z.object({
  keyword: z.string()
    .trim()
    .min(1, "Keyword must be at least 1 character")
    .max(200, "Keyword must be less than 200 characters"),
  languageCode: z.string()
    .regex(/^[a-z]{2}$/, "Invalid language code format")
    .optional()
    .default('en'),
  locationCode: z.number()
    .int("Location code must be an integer")
    .min(1, "Invalid location code")
    .max(9999999, "Invalid location code")
    .optional()
    .default(2840),
  limit: z.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(1000, "Limit cannot exceed 1000")
    .optional()
    .default(100)
});

interface KeywordRequest {
  keyword: string;
  languageCode: string;
  locationCode: number;
  limit: number;
}

serve(async (req) => {
  console.log('=== KEYWORD RESEARCH REQUEST RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.get('origin'));
  console.log('Authorization header present:', !!req.headers.get('Authorization'));
  console.log('Timestamp:', new Date().toISOString());
  
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify JWT with admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Create user-context Supabase client for database operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Check if user can perform keyword research (quota check)
    const { data: canPerform, error: quotaError } = await supabase
      .rpc('can_user_perform_action', {
        user_id_param: user.id,
        action_type: 'keyword'
      });

    if (quotaError) {
      console.error('Error checking usage quota:', quotaError);
      throw new Error('Unable to verify usage quota. Please try again.');
    }

    if (!canPerform) {
      throw new Error('You have reached your keyword research quota for this billing period. Please upgrade your plan to continue.');
    }

    console.log(`User ${user.id} has available quota for keyword research`);

    // Parse and validate input
    const rawBody = await req.json();
    const validatedData = KeywordRequestSchema.parse(rawBody);
    const { keyword, languageCode, locationCode, limit } = validatedData;

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
    
    // Normalize whitespace for comparison (handles multi-word phrases correctly)
    const normalizeKeyword = (kw: string) => kw.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedSeed = normalizeKeyword(keyword);
    
    // Check if seed keyword is in the results
    const seedKeywordInResults = keywordResults.some((item: any) => 
      normalizeKeyword(item.keyword || '') === normalizedSeed
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
            normalizeKeyword(item.keyword || '') === normalizedSeed
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
      if (normalizeKeyword(a.keyword) === normalizedSeed) return -1;
      if (normalizeKeyword(b.keyword) === normalizedSeed) return 1;
      return 0;
    });
    
    // If seed keyword still not in results after fallback, add with safe defaults
    const seedKeywordExists = processedResults.some((r: any) => 
      normalizeKeyword(r.keyword) === normalizedSeed
    );
    
    if (!seedKeywordExists) {
      console.log(`Adding seed keyword "${keyword}" with safe defaults (no metrics available)`);
      processedResults.unshift({
        research_id: research.id,
        keyword: keyword,
        search_volume: 0, // Show 0 for volume when no data
        cpc: 0, // Show 0 for cpc when no data
        intent: 'informational',
        difficulty: null, // null will display as "—" in UI (truly missing)
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

    // Increment usage counter after successful research
    const { error: usageError } = await supabase
      .rpc('increment_usage', {
        user_id_param: user.id,
        action_type: 'keyword',
        amount: 1
      });

    if (usageError) {
      console.error('Error incrementing usage (non-critical):', usageError);
      // Don't fail the request, just log the error
    }

    console.log(`Successfully incremented keyword usage for user ${user.id}`);
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
    
    // Add note if seed keyword has no metrics (0 is valid data, null means truly missing)
    const seedResult = processedResults.find((r: any) => 
      normalizeKeyword(r.keyword) === normalizedSeed
    );
    if (seedResult && seedResult.search_volume === 0 && seedResult.cpc === 0 && seedResult.difficulty === null) {
      responseMetadata.seed_keyword_note = 'No metrics returned by DataForSEO for this term.';
    }

    return new Response(JSON.stringify(responseMetadata), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in keyword-research function:', error);
    const corsHeaders = getCorsHeaders(req);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input parameters',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});