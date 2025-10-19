import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { callDataForSEO } from "../_shared/dataforseo/client.ts";

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
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Admin client for JWT verification only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Module name for usage tracking
const MODULE_NAME = 'serp-analysis';

// Input validation schema
const SerpRequestSchema = z.object({
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
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(10)
});

interface SerpRequest {
  keyword: string;
  languageCode: string;
  locationCode: number;
  limit: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    // Check if user can perform SERP analysis (quota check)
    const { data: canPerform, error: quotaError } = await supabase
      .rpc('can_user_perform_action', {
        user_id_param: user.id,
        action_type: 'serp'
      });

    if (quotaError) {
      console.error('Error checking usage quota:', quotaError);
      throw new Error('Unable to verify usage quota. Please try again.');
    }

    if (!canPerform) {
      throw new Error('You have reached your SERP analysis quota for this billing period. Please upgrade your plan to continue.');
    }

    console.log(`User ${user.id} has available quota for SERP analysis`);

    // Parse and validate input
    const rawBody = await req.json();
    const validatedData = SerpRequestSchema.parse(rawBody);
    const { keyword, languageCode, locationCode, limit } = validatedData;

    console.log(`Starting SERP analysis for user ${user.id}: ${keyword} (limit: ${limit})`);

    // Calculate number of SERPs needed (1 SERP = 10 results)
    const serpsNeeded = Math.ceil(limit / 10);
    
    // Prepare API request for SERP data
    const apiPayload = [{
      "keyword": keyword,
      "location_code": locationCode,
      "language_code": languageCode,
      "device": "desktop",
      "os": "windows",
      "depth": serpsNeeded * 10  // Request enough depth to get all pages
    }];

    console.log('SERP API Payload:', JSON.stringify(apiPayload, null, 2));

    // Call SERP API using centralized client
    const serpData = await callDataForSEO({
      endpoint: '/serp/google/organic/live/advanced',
      payload: apiPayload,
      module: MODULE_NAME,
      userId: user.id,
    });

    if (!serpData.tasks || serpData.tasks[0].status_code !== 20000) {
      const errorMsg = serpData.tasks?.[0]?.status_message || 'Unknown SERP API error';
      console.error('SERP API error:', errorMsg);
      throw new Error(`SERP API error: ${errorMsg}`);
    }

    // Extract organic results (non-ads, non-map entries)
    const rawResults = serpData.tasks[0].result || [];
    const serpResults = rawResults[0]?.items || [];
    
    console.log(`Received ${serpResults.length} SERP results`);
    
    // Filter and process organic results up to the requested limit
    const organicResults = serpResults
      .filter((item: any) => 
        item.type === 'organic' && 
        !item.is_paid && 
        !item.is_featured_snippet &&
        !item.is_malicious
      )
      .slice(0, limit)
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

    // Calculate estimated cost based on DataForSEO Live Mode pricing (as of Oct 2, 2025)
    // Google Organic SERP API Live Mode: $0.002 for first SERP, $0.0015 for each additional SERP
    // 1 SERP = 10 search results
    const actualSerpsUsed = Math.ceil(organicResults.length / 10);
    const estimatedCost = actualSerpsUsed === 0 ? 0 : 
                         actualSerpsUsed === 1 ? 0.002 : 
                         0.002 + ((actualSerpsUsed - 1) * 0.0015);

    // Store SERP results as a special research record (optional - you can modify this based on needs)
    const { data: research, error: researchError } = await supabase
      .from('keyword_research')
      .insert({
        user_id: user.id,
        seed_keyword: keyword,
        language_code: languageCode,
        location_code: locationCode,
        results_limit: organicResults.length,
        total_results: organicResults.length,
        api_cost: estimatedCost
      })
      .select()
      .single();

    if (researchError) {
      console.error('Error creating SERP research record:', researchError);
      // Don't throw error for SERP analysis, just continue without storing
    }

    // Increment usage counter after successful analysis
    const { error: usageError } = await supabase
      .rpc('increment_usage', {
        user_id_param: user.id,
        action_type: 'serp',
        amount: 1
      });

    if (usageError) {
      console.error('Error incrementing usage (non-critical):', usageError);
      // Don't fail the request, just log the error
    }

    console.log(`Successfully incremented SERP usage for user ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      research_id: research?.id || null,
      keyword: keyword,
      results: organicResults,
      total_results: organicResults.length,
      estimated_cost: estimatedCost.toFixed(3)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in serp-analysis function:', error);
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