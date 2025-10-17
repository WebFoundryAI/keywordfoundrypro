import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  reportId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json() as ProcessRequest;

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: 'reportId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authenticated user from the JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with anon key to verify JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify the user's JWT and get user info
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch report details and verify ownership
    const { data: report, error: reportError } = await supabase
      .from('domain_gap_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found');
    }

    // Security check: verify the report belongs to the authenticated user
    if (report.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Report does not belong to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('domain_gap_reports')
      .update({ status: 'processing' })
      .eq('id', reportId);

    // Get DataForSEO credentials
    const dataforSeoLogin = Deno.env.get('DATAFORSEO_LOGIN');
    const dataforSeoPassword = Deno.env.get('DATAFORSEO_PASSWORD');

    if (!dataforSeoLogin || !dataforSeoPassword) {
      throw new Error('DataForSEO credentials not configured');
    }

    const credentials = {
      login: dataforSeoLogin,
      password: dataforSeoPassword,
    };

    // Get location code from market
    const marketLocationMap: Record<string, number> = {
      'us': 2840,
      'uk': 2826,
      'ca': 2124,
      'au': 2036,
    };
    const locationCode = marketLocationMap[report.market] || 2840;

    // Fetch ranked keywords for both domains (top 500 each)
    console.log(`Fetching keywords for ${report.my_domain}`);
    const myKeywords = await getDomainRankedKeywords(
      report.my_domain,
      locationCode,
      credentials,
      500
    );

    console.log(`Fetching keywords for ${report.competitor_domain}`);
    const competitorKeywords = await getDomainRankedKeywords(
      report.competitor_domain,
      locationCode,
      credentials,
      500
    );

    // Build keyword maps
    const myKeywordMap = new Map(myKeywords.map(k => [k.keyword.toLowerCase(), k]));
    const competitorKeywordMap = new Map(competitorKeywords.map(k => [k.keyword.toLowerCase(), k]));

    // Calculate intersection and missing
    const missingKeywords: string[] = [];
    const overlapKeywords: string[] = [];

    for (const [keyword] of competitorKeywordMap) {
      if (myKeywordMap.has(keyword)) {
        overlapKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    }

    console.log(`Found ${missingKeywords.length} missing keywords, ${overlapKeywords.length} overlap keywords`);

    // Enrich keywords with bulk metrics
    const allKeywordsToEnrich = [...new Set([...missingKeywords, ...overlapKeywords])];
    const enrichedMetrics = await getBulkKeywordMetrics(
      allKeywordsToEnrich.slice(0, 1000), // Limit to 1000 for credit efficiency
      locationCode,
      credentials
    );

    const metricsMap = new Map(enrichedMetrics.map(m => [m.keyword.toLowerCase(), m]));

    // Optionally fetch SERP features
    let serpFeaturesMap = new Map<string, string[]>();
    if (report.include_serp) {
      const topKeywordsByVolume = allKeywordsToEnrich
        .map(kw => ({
          keyword: kw,
          volume: metricsMap.get(kw.toLowerCase())?.search_volume || 0,
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 200)
        .map(k => k.keyword);

      console.log(`Fetching SERP features for top ${topKeywordsByVolume.length} keywords`);
      const serpFeatures = await getKeywordSerpFeatures(
        topKeywordsByVolume,
        locationCode,
        credentials
      );

      serpFeaturesMap = new Map(serpFeatures.map(s => [s.keyword.toLowerCase(), s.features]));
    }

    // Prepare gap_keywords records
    const gapKeywords: any[] = [];

    // Process missing keywords
    for (const keyword of missingKeywords) {
      const metrics = metricsMap.get(keyword.toLowerCase());
      const competitorData = competitorKeywordMap.get(keyword.toLowerCase());
      const serpFeatures = serpFeaturesMap.get(keyword.toLowerCase());

      if (!metrics || !competitorData) continue;

      const volume = metrics.search_volume || 0;
      const difficulty = metrics.keyword_difficulty || 0;
      const cpc = metrics.cpc || 0;
      const theirPos = competitorData.position || 0;

      // Opportunity score: (volume / (difficulty + 1)) * (1 + max(0, theirPos - 100) / 10)
      const opportunityScore = (volume / (difficulty + 1)) * (1 + Math.max(0, theirPos - 100) / 10);

      gapKeywords.push({
        report_id: reportId,
        keyword,
        volume,
        difficulty,
        cpc,
        their_pos: theirPos,
        your_pos: null,
        delta: null,
        serp_features: serpFeatures ? { features: serpFeatures } : null,
        opportunity_score: opportunityScore,
        kind: 'missing',
      });
    }

    // Process overlap keywords
    for (const keyword of overlapKeywords) {
      const metrics = metricsMap.get(keyword.toLowerCase());
      const myData = myKeywordMap.get(keyword.toLowerCase());
      const competitorData = competitorKeywordMap.get(keyword.toLowerCase());
      const serpFeatures = serpFeaturesMap.get(keyword.toLowerCase());

      if (!metrics || !myData || !competitorData) continue;

      const volume = metrics.search_volume || 0;
      const difficulty = metrics.keyword_difficulty || 0;
      const cpc = metrics.cpc || 0;
      const yourPos = myData.position || 0;
      const theirPos = competitorData.position || 0;
      const delta = yourPos - theirPos;

      const opportunityScore = (volume / (difficulty + 1)) * (1 + Math.max(0, theirPos - yourPos) / 10);

      gapKeywords.push({
        report_id: reportId,
        keyword,
        volume,
        difficulty,
        cpc,
        their_pos: theirPos,
        your_pos: yourPos,
        delta,
        serp_features: serpFeatures ? { features: serpFeatures } : null,
        opportunity_score: opportunityScore,
        kind: 'overlap',
      });
    }

    // Insert in chunks of 200
    const chunkSize = 200;
    for (let i = 0; i < gapKeywords.length; i += chunkSize) {
      const chunk = gapKeywords.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('gap_keywords')
        .insert(chunk);

      if (insertError) {
        console.error('Error inserting keywords chunk:', insertError);
        throw insertError;
      }

      console.log(`Inserted chunk ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(gapKeywords.length / chunkSize)}`);
    }

    // Update report status to 'done' (matching the client expectation)
    await supabase
      .from('domain_gap_reports')
      .update({ status: 'done' })
      .eq('id', reportId);

    console.log(`Completed processing report ${reportId}`);

    return new Response(
      JSON.stringify({ success: true, keywordsProcessed: gapKeywords.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing competitor gap:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions (copied from dataforseo.ts for edge function context)

async function getDomainRankedKeywords(
  domain: string,
  locationCode: number,
  credentials: { login: string; password: string },
  maxKeywords: number
): Promise<any[]> {
  const url = 'https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live';
  const authHeader = `Basic ${btoa(`${credentials.login}:${credentials.password}`)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      target: domain,
      location_code: locationCode,
      language_code: 'en',
      load_rank_absolute: true,
      limit: maxKeywords,
    }]),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO API error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.tasks?.[0]?.result || [];

  return results.flatMap((item: any) =>
    (item.ranked_keywords || []).map((kw: any) => ({
      keyword: kw.keyword_data?.keyword || '',
      position: kw.ranked_serp_element?.serp_item?.rank_absolute || 0,
      search_volume: kw.keyword_data?.keyword_info?.search_volume || 0,
    }))
  );
}

async function getBulkKeywordMetrics(
  keywords: string[],
  locationCode: number,
  credentials: { login: string; password: string }
): Promise<any[]> {
  const url = 'https://api.dataforseo.com/v3/dataforseo_labs/google/bulk_keyword_difficulty/live';
  const authHeader = `Basic ${btoa(`${credentials.login}:${credentials.password}`)}`;

  const batchSize = 100;
  const results: any[] = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keywords: batch,
        location_code: locationCode,
        language_code: 'en',
      }]),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();
    const batchResults = data.tasks?.[0]?.result || [];

    const metrics = batchResults.flatMap((item: any) =>
      (item.items || []).map((kw: any) => ({
        keyword: kw.keyword || '',
        search_volume: kw.keyword_info?.search_volume || 0,
        cpc: kw.keyword_info?.cpc || 0,
        keyword_difficulty: kw.keyword_properties?.keyword_difficulty || 0,
      }))
    );

    results.push(...metrics);

    if (i + batchSize < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

async function getKeywordSerpFeatures(
  keywords: string[],
  locationCode: number,
  credentials: { login: string; password: string }
): Promise<any[]> {
  const url = 'https://api.dataforseo.com/v3/dataforseo_labs/google/serp_competitors/live';
  const authHeader = `Basic ${btoa(`${credentials.login}:${credentials.password}`)}`;

  const batchSize = 50;
  const results: any[] = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keywords: batch,
        location_code: locationCode,
        language_code: 'en',
      }]),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();
    const batchResults = data.tasks?.[0]?.result || [];

    const features = batchResults.flatMap((item: any) =>
      (item.items || []).map((kw: any) => ({
        keyword: kw.keyword || '',
        features: (kw.serp_info?.features || []).map((f: any) => f.type || '').filter(Boolean),
      }))
    );

    results.push(...features);

    if (i + batchSize < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
