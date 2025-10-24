import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { callDataForSEO, DataForSEOError } from "../_shared/dataforseo/client.ts";

// CORS - Allowed origins
const allowedOrigins = [
  'https://vhjffdzroebdkbmvcpgv.supabase.co',
  'https://keywordfoundrypro.com',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://lovable.app',
  'https://lovable.dev'
];

// Dynamic CORS headers based on request origin
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.some(allowed =>
    origin === allowed ||
    origin.startsWith(allowed) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovable.dev')
  );
  const allowOrigin = isAllowed ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// Initialize Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Admin client for JWT verification only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Module name for usage tracking
const MODULE_NAME = 'related-keywords';

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
  depth: z.number()
    .int("Depth must be an integer")
    .min(0, "Depth must be at least 0")
    .max(4, "Depth cannot exceed 4")
    .optional()
    .default(1),
  limit: z.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(1000, "Limit cannot exceed 1000")
    .optional()
    .default(100),
  offset: z.number()
    .int("Offset must be an integer")
    .min(0, "Offset cannot be negative")
    .optional()
    .default(0),
  filters: z.array(z.any()).optional(),
  order_by: z.array(z.string()).optional()
});

interface KeywordRequest {
  keyword: string;
  languageCode?: string;
  locationCode?: number;
  depth?: number;
  limit?: number;
  offset?: number;
  filters?: any[];
  order_by?: string[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify JWT with admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Create user-context Supabase client for database operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Parse and validate input
    const rawBody = await req.json();
    const validatedData = KeywordRequestSchema.parse(rawBody);
    const { 
      keyword, 
      languageCode, 
      locationCode,
      depth,
      limit,
      offset,
      filters,
      order_by
    } = validatedData;

    // Use validated values directly
    const validDepth = depth;
    const validLimit = limit;

    // Prepare the DataForSEO API request - using Labs Related Keywords endpoint
    const apiPayload: any = {
      "keyword": keyword,
      "language_code": languageCode,
      "location_code": locationCode,
      "depth": validDepth,
      "limit": validLimit
    }

    // Add offset if provided
    if (offset > 0) {
      apiPayload.offset = offset;
    }

    // Pass through filters and order_by if provided
    if (filters && filters.length > 0) {
      apiPayload.filters = filters;
    }
    if (order_by && order_by.length > 0) {
      apiPayload.order_by = order_by;
    }

    console.log('Calling DataForSEO Labs API with payload:', JSON.stringify(apiPayload))

    // Call DataForSEO Labs API for related keywords using centralized client
    const apiData = await callDataForSEO({
      endpoint: '/dataforseo_labs/google/related_keywords/live',
      payload: [apiPayload],
      module: MODULE_NAME,
      userId: user.id,
    });

    console.log('DataForSEO Labs API response (first 200 chars):', JSON.stringify(apiData).substring(0, 200))

    if (!apiData.tasks || !apiData.tasks[0]) {
      throw new Error('Invalid API response structure')
    }

    const task = apiData.tasks[0]
    
    if (task.status_code !== 20000) {
      console.error('API error:', task.status_code, task.status_message)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `API Error (${task.status_code}): ${task.status_message}`,
          status_code: task.status_code,
          status_message: task.status_message
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    if (!task.result || !task.result[0] || !task.result[0].items) {
      console.log('No related keywords found')
      return new Response(
        JSON.stringify({ 
          success: true,
          results: [],
          total_results: 0,
          estimated_cost: 0,
          message: 'No related keywords found. Try a broader seed keyword or change location/language.',
          status_code: task.status_code,
          status_message: task.status_message
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const items = task.result[0].items

    // Extract keywords for batch intent classification
    const keywordsToClassify = items
      .filter((item: any) => {
        return item.keyword_data && 
               item.keyword_data.keyword && 
               (item.keyword_data.keyword_info?.search_volume || 0) > 0
      })
      .map((item: any) => item.keyword_data.keyword);

    console.log(`Fetching intent for ${keywordsToClassify.length} keywords`);

    // Call DataForSEO Search Intent API
    const intentMap: Record<string, string> = {};
    if (keywordsToClassify.length > 0) {
      try {
        const intentData = await callDataForSEO({
          endpoint: '/dataforseo_labs/google/search_intent/live',
          payload: [{
            "language_code": languageCode,
            "keywords": keywordsToClassify
          }],
          module: `${MODULE_NAME}-intent`,
          userId: user.id,
        });

        if (intentData.tasks?.[0]?.status_code === 20000) {
          const intentItems = intentData.tasks[0].result?.[0]?.items || [];
          intentItems.forEach((item: any) => {
            if (item.keyword && item.keyword_intent?.label) {
              intentMap[item.keyword.toLowerCase()] = item.keyword_intent.label;
            }
          });
          console.log(`Successfully classified ${Object.keys(intentMap).length} keywords with DataForSEO intent`);
        }
      } catch (intentError) {
        console.error('Intent classification error (non-critical):', intentError);
      }
    }

    // Process the keywords from Labs endpoint
    const relatedKeywords = items
      .filter((item: any) => {
        // Filter out items without keywords or search volume
        return item.keyword_data && 
               item.keyword_data.keyword && 
               (item.keyword_data.keyword_info?.search_volume || 0) > 0
      })
      .map((item: any) => {
        const keywordData = item.keyword_data
        const keywordInfo = keywordData.keyword_info || {}
        const keyword = keywordData.keyword;
        
        // Use DataForSEO intent if available, otherwise use fallback
        const intent = intentMap[keyword.toLowerCase()] || determineIntentFallback(keyword);
        
        return {
          keyword: keyword,
          searchVolume: keywordInfo.search_volume || 0,
          cpc: keywordInfo.cpc || 0,
          competition: keywordInfo.competition || 0,
          competition_level: keywordInfo.competition_level || null,
          difficulty: convertCompetitionToDifficulty(keywordInfo.competition_level, keywordInfo.competition_index),
          intent: intent,
          relevance: Math.round((item.relevance || 0) * 100), // Use API relevance score
          trend: keywordInfo.monthly_searches || null,
          categories: keywordData.categories || []
        }
      })
      .sort((a: any, b: any) => b.searchVolume - a.searchVolume)

    console.log(`Processed ${relatedKeywords.length} related keywords`)

    const totalResults = relatedKeywords.length
    const estimatedCost = 0.02 // Estimated cost per request

    // Store results in database if any exist
    if (relatedKeywords.length > 0) {
      // First create a research record
      const { data: research, error: researchError } = await supabase
        .from('keyword_research')
        .insert({
          user_id: user.id,
          seed_keyword: keyword,
          language_code: languageCode,
          location_code: locationCode,
          results_limit: relatedKeywords.length,
          total_results: relatedKeywords.length,
          api_cost: estimatedCost
        })
        .select()
        .single();

      if (researchError) {
        console.error('Error creating research record:', researchError);
        throw new Error('Failed to create research record');
      }

      // Then store the keyword results
      const resultsWithResearchId = relatedKeywords.map((result: any) => ({
        research_id: research.id,
        keyword: result.keyword,
        search_volume: result.searchVolume,
        cpc: result.cpc,
        intent: result.intent,
        difficulty: result.difficulty,
        metrics_source: 'dataforseo_related'
      }));

      const { error: resultsError } = await supabase
        .from('keyword_results')
        .insert(resultsWithResearchId);

      if (resultsError) {
        console.error('Error storing keyword results:', resultsError);
        throw new Error('Failed to store keyword results');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          research_id: research.id,
          results: relatedKeywords,
          total_results: totalResults,
          estimated_cost: estimatedCost.toFixed(4),
          offset: offset,
          limit: validLimit,
          has_more: relatedKeywords.length === validLimit
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: relatedKeywords,
        total_results: totalResults,
        estimated_cost: estimatedCost.toFixed(4),
        offset: offset,
        limit: validLimit,
        has_more: relatedKeywords.length === validLimit
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in related keywords function:', error)
    const corsHeaders = getCorsHeaders(req);
    
    // Handle DataForSEO specific errors (rate limit, credits)
    if (error instanceof DataForSEOError) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error.message,
          error_code: error.isRateLimit ? 'RATE_LIMIT' : error.isCreditsExhausted ? 'CREDITS_EXHAUSTED' : 'API_ERROR',
        }),
        { 
          status: error.statusCode,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid input parameters',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

function convertCompetitionToDifficulty(competition_level: string, competition_index: number): number {
  // Use competition_index if available (0-100 scale)
  if (competition_index !== null && competition_index !== undefined) {
    return Math.round(competition_index)
  }
  
  // Fallback to competition_level string conversion
  switch (competition_level?.toUpperCase()) {
    case 'HIGH':
      return 80
    case 'MEDIUM':
      return 50
    case 'LOW':
      return 20
    default:
      return 0
  }
}

// Fallback intent determination (used only if DataForSEO intent API fails)
function determineIntentFallback(keyword: string): string {
  const lowerKeyword = keyword.toLowerCase();
  
  // Local service/commercial intent - "near me", locations, service keywords
  if (lowerKeyword.includes('near me') || 
      lowerKeyword.includes('near by') ||
      lowerKeyword.includes('nearby') ||
      lowerKeyword.match(/\b(plumber|electrician|contractor|repair|service|installation|clearance|removal|cleaning|maintenance|emergency)\b/)) {
    return 'commercial';
  }
  
  // Transactional intent - buying/ordering
  if (lowerKeyword.match(/\b(buy|purchase|order|shop|checkout|cart|price|cost|cheap|discount|deal|sale|coupon|promo)\b/)) {
    return 'transactional';
  }
  
  // Commercial intent - research before purchase
  if (lowerKeyword.match(/\b(best|top|review|compare|comparison|vs|versus|alternative|recommendation)\b/)) {
    return 'commercial';
  }
  
  // Navigational intent - seeking specific sites
  if (lowerKeyword.match(/\b(login|sign in|website|official|homepage|portal|account|dashboard)\b/)) {
    return 'navigational';
  }
  
  // Default to informational
  return 'informational';
}