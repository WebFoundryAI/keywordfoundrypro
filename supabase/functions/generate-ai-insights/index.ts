import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kfp-request-id',
};

// Constants for validation
const MAX_BODY_SIZE_KB = 256;
const MAX_COMPETITORS = 50;
const MAX_KEYWORDS = 1000;
const UPSTREAM_TIMEOUT_MS = 25000;

// Helper to create JSON error response
const jsonError = (error: string, code: string, status: number, extra?: any) => {
  return new Response(
    JSON.stringify({ error, code, ...extra }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

// Helper to create JSON success response
const jsonSuccess = (data: any, meta: any) => {
  return new Response(
    JSON.stringify({ ...data, meta }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

// Timeout wrapper for fetch calls
async function fetchWithTimeout(url: string, options: any, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('UPSTREAM_TIMEOUT');
    }
    throw error;
  }
}

// Helper to log to database (non-blocking)
async function logToDatabase(
  supabaseClient: any,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  metadata?: any,
  userId?: string,
  requestId?: string
) {
  try {
    await supabaseClient.from('system_logs').insert({
      level,
      function_name: 'generate-ai-insights',
      message,
      metadata,
      user_id: userId,
      request_id: requestId
    });
  } catch (err) {
    // Don't fail the request if logging fails
    console.error('[generate-ai-insights] Failed to write to system_logs:', err);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = req.headers.get('x-kfp-request-id') || crypto.randomUUID();

  try {
    // Step 1: Check required environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    const missingVars: string[] = [];
    if (!openAIApiKey) missingVars.push('OPENAI_API_KEY');
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');
    
    if (missingVars.length > 0) {
      console.error('[generate-ai-insights]', requestId, 'Missing configuration:', missingVars);

      // Try to log to database (may fail if SUPABASE vars are missing)
      try {
        const supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '');
        await logToDatabase(
          supabaseClient,
          'error',
          'Missing required environment variables',
          { missing: missingVars, error_code: 'CONFIG_MISSING' },
          undefined,
          requestId
        );
      } catch (e) {
        // Ignore - can't log if supabase vars are missing
      }

      return jsonError(
        'Server configuration error - missing required environment variables',
        'CONFIG_MISSING',
        500,
        { missing: missingVars, requestId }
      );
    }

    // Step 2: Parse and validate payload size
    const bodyText = await req.text();
    const bodySizeKB = new TextEncoder().encode(bodyText).length / 1024;
    
    if (bodySizeKB > MAX_BODY_SIZE_KB) {
      console.error('[generate-ai-insights]', requestId, `Payload too large: ${bodySizeKB.toFixed(2)}KB`);

      // Create supabase client for logging
      const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
      await logToDatabase(
        supabaseClient,
        'error',
        `Payload too large: ${bodySizeKB.toFixed(2)}KB exceeds ${MAX_BODY_SIZE_KB}KB`,
        {
          error_code: 'PAYLOAD_TOO_LARGE',
          payload_size_kb: bodySizeKB.toFixed(2),
          max_size_kb: MAX_BODY_SIZE_KB
        },
        undefined,
        requestId
      );

      return jsonError(
        `Payload size ${bodySizeKB.toFixed(0)}KB exceeds maximum ${MAX_BODY_SIZE_KB}KB`,
        'PAYLOAD_TOO_LARGE',
        413,
        {
          limits: { maxBodyKB: MAX_BODY_SIZE_KB, maxCompetitors: MAX_COMPETITORS, maxKeywords: MAX_KEYWORDS },
          requestId
        }
      );
    }

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return jsonError('Invalid JSON in request body', 'INVALID_INPUT', 422, { requestId });
    }

    const { analysisData, competitorDomain } = body;
    
    // Step 3: Validate input schema
    if (!analysisData || typeof analysisData !== 'object') {
      return jsonError('Missing or invalid analysisData object', 'INVALID_INPUT', 422, { requestId });
    }
    
    if (!competitorDomain || typeof competitorDomain !== 'string' || competitorDomain.trim().length === 0) {
      return jsonError('Missing or invalid competitorDomain', 'INVALID_INPUT', 422, { requestId });
    }

    // Validate analysisData structure
    if (!Array.isArray(analysisData.keyword_gap_list)) {
      return jsonError('analysisData.keyword_gap_list must be an array', 'INVALID_INPUT', 422, { requestId });
    }

    if (analysisData.keyword_gap_list.length > MAX_KEYWORDS) {
      return jsonError(
        `Too many keywords: ${analysisData.keyword_gap_list.length} exceeds maximum ${MAX_KEYWORDS}`,
        'PAYLOAD_TOO_LARGE',
        413,
        { limits: { maxKeywords: MAX_KEYWORDS }, requestId }
      );
    }

    // Step 4: Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonError('Missing authorization header', 'UNAUTHORIZED', 401, { requestId });
    }

    const supabaseClient = createClient(
      supabaseUrl!,
      supabaseAnonKey!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      await logToDatabase(
        supabaseClient,
        'error',
        'Invalid or expired authorization token',
        { error_code: 'UNAUTHORIZED' },
        undefined,
        requestId
      );
      return jsonError('Invalid or expired authorization token', 'UNAUTHORIZED', 401, { requestId });
    }

    console.log('[generate-ai-insights]', requestId, 'Processing request for user:', user.id);

    // Step 5: Create a summary of the analysis data
    const summary = {
      keyword_gaps_count: analysisData.keyword_gap_list?.length || 0,
      top_keywords: analysisData.keyword_gap_list?.slice(0, 10).map((k: any) => ({
        keyword: k.keyword,
        position: k.competitor_rank || k.position,
        search_volume: k.search_volume
      })) || [],
      backlinks: {
        your_domain: analysisData.backlink_summary?.your_domain || {},
        competitor: analysisData.backlink_summary?.competitor_domain || {}
      },
      technical: {
        your_domain: analysisData.onpage_summary?.your_domain || {},
        competitor: analysisData.onpage_summary?.competitor_domain || {}
      }
    };

    const prompt = `Analyze this SEO competitor comparison data and write a short report for a marketing executive.
Focus on keyword gaps, backlink strength, and technical performance.
Provide clear, prioritized recommendations to outrank the competitor.

Data:
${JSON.stringify(summary, null, 2)}

Please provide:
1. Executive Summary (2-3 sentences)
2. Key Findings (3-4 bullet points)
3. Strategic Recommendations (3-5 actionable items with priority levels)
4. Quick Wins (2-3 immediate actions)

Keep the tone professional but conversational. Focus on actionable insights.`;

    console.log('[generate-ai-insights]', requestId, 'Calling OpenAI API with timeout:', UPSTREAM_TIMEOUT_MS);

    // Step 6: Call OpenAI with timeout
    let response;
    try {
      response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert SEO strategist who provides clear, actionable competitive analysis reports for marketing executives.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
        }),
      }, UPSTREAM_TIMEOUT_MS);
    } catch (error: any) {
      if (error.message === 'UPSTREAM_TIMEOUT') {
        console.error('[generate-ai-insights]', requestId, 'OpenAI API timeout after', UPSTREAM_TIMEOUT_MS, 'ms');

        await logToDatabase(
          supabaseClient,
          'error',
          `OpenAI API timeout after ${UPSTREAM_TIMEOUT_MS / 1000}s`,
          {
            error_code: 'UPSTREAM_TIMEOUT',
            timeout_ms: UPSTREAM_TIMEOUT_MS
          },
          user.id,
          requestId
        );

        return jsonError(
          `AI model request timed out after ${UPSTREAM_TIMEOUT_MS / 1000}s`,
          'UPSTREAM_TIMEOUT',
          504,
          { requestId }
        );
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-ai-insights]', requestId, 'OpenAI API error:', response.status, errorText.substring(0, 200));
      
      // Map OpenAI errors to appropriate status codes
      if (response.status === 429) {
        await logToDatabase(
          supabaseClient,
          'error',
          'OpenAI API rate limit exceeded',
          {
            error_code: 'RATE_LIMIT',
            status: response.status,
            response_preview: errorText.substring(0, 200)
          },
          user.id,
          requestId
        );
        return jsonError('AI model rate limit exceeded. Please try again in a moment.', 'RATE_LIMIT', 429, { requestId });
      }
      if (response.status === 401 || response.status === 403) {
        await logToDatabase(
          supabaseClient,
          'error',
          'OpenAI API authentication failed - invalid or missing API key',
          {
            error_code: 'CONFIG_MISSING',
            status: response.status,
            response_preview: errorText.substring(0, 200)
          },
          user.id,
          requestId
        );
        return jsonError('AI model authentication failed', 'CONFIG_MISSING', 500, { missing: ['Valid OPENAI_API_KEY'], requestId });
      }

      await logToDatabase(
        supabaseClient,
        'error',
        `OpenAI API error: ${response.status}`,
        {
          error_code: 'UPSTREAM_ERROR',
          status: response.status,
          response_preview: errorText.substring(0, 200)
        },
        user.id,
        requestId
      );

      return jsonError(`AI model returned error: ${response.status}`, 'UPSTREAM_ERROR', 502, { requestId });
    }

    const data = await response.json();
    const reportText = data.choices?.[0]?.message?.content;
    
    if (!reportText) {
      console.error('[generate-ai-insights]', requestId, 'OpenAI response missing content:', JSON.stringify(data).substring(0, 200));
      return jsonError('AI model returned invalid response format', 'UPSTREAM_ERROR', 502, { requestId });
    }

    // Step 7: Store the report (non-blocking)
    const { error: insertError } = await supabaseClient
      .from('ai_reports')
      .insert({
        user_id: user.id,
        competitor: competitorDomain.trim(),
        report_text: reportText
      });

    if (insertError) {
      console.error('[generate-ai-insights]', requestId, 'Error storing AI report:', insertError);
      // Don't fail the request if storage fails
    }

    const durationMs = Date.now() - startTime;
    console.log('[generate-ai-insights]', requestId, 'Success in', durationMs, 'ms');

    // Log successful completion
    await logToDatabase(
      supabaseClient,
      'info',
      `AI insights generated successfully in ${durationMs}ms`,
      {
        duration_ms: durationMs,
        keyword_gaps_count: summary.keyword_gaps_count,
        competitor_domain: competitorDomain,
        report_length: reportText.length
      },
      user.id,
      requestId
    );

    // Step 8: Return success response with meta
    return jsonSuccess(
      {
        report: reportText,
        summary: {
          keyword_gaps_count: summary.keyword_gaps_count,
          competitor_domain: competitorDomain
        }
      },
      {
        requestId,
        durationMs,
        timestamp: new Date().toISOString()
      }
    );

  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('[generate-ai-insights]', requestId, 'Error:', error.message || error);

    // Try to log the unexpected error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (supabaseUrl && supabaseAnonKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        await logToDatabase(
          supabaseClient,
          'error',
          `Unexpected error: ${error.message || 'Unknown error'}`,
          {
            error_code: 'INTERNAL_ERROR',
            error_message: error.message,
            error_stack: error.stack?.substring(0, 500),
            duration_ms: durationMs
          },
          undefined,
          requestId
        );
      }
    } catch (logErr) {
      // Ignore logging errors
      console.error('[generate-ai-insights]', requestId, 'Failed to log error:', logErr);
    }

    // Handle unexpected errors
    return jsonError(
      error.message || 'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      { requestId, durationMs }
    );
  }
});