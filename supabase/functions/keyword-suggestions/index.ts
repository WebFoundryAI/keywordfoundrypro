import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

// Keyword research API credentials
const apiLogin = Deno.env.get('DATAFORSEO_LOGIN');
const apiPassword = Deno.env.get('DATAFORSEO_PASSWORD');

// Input validation schema
const SuggestionsRequestSchema = z.object({
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
    .default(2840)
});

interface SuggestionsRequest {
  keyword: string;
  languageCode?: string;
  locationCode?: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const rawBody = await req.json();
    const validatedData = SuggestionsRequestSchema.parse(rawBody);
    const { keyword, languageCode, locationCode } = validatedData;

    console.log(`Getting keyword suggestions for: ${keyword}`);

    // Prepare API request for keyword suggestions
    const apiPayload = [{
      "language_code": languageCode,
      "location_code": locationCode,
      "keyword": keyword.trim(),
      "limit": 10
    }];

    // Call keyword research API for suggestions
    const suggestionsResponse = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${apiLogin}:${apiPassword}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload)
    });

    const suggestionsData = await suggestionsResponse.json();
    console.log('Keyword suggestions response received');

    if (!suggestionsData.tasks || suggestionsData.tasks[0].status_code !== 20000) {
      throw new Error(`API error: ${suggestionsData.tasks?.[0]?.status_message || 'Unknown error'}`);
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