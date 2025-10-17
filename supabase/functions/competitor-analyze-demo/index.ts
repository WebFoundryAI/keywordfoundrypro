import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { yourDomain, competitorDomain } = await req.json();
    
    if (!yourDomain || !competitorDomain) {
      return new Response(
        JSON.stringify({ error: 'Both domains are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call DataForSEO APIs
    const login = Deno.env.get('DATAFORSEO_LOGIN');
    const password = Deno.env.get('DATAFORSEO_PASSWORD');
    
    if (!login || !password) {
      throw new Error('DataForSEO credentials not configured');
    }

    const auth = btoa(`${login}:${password}`);

    // Fetch ranked keywords for both domains (limited to 100 for demo)
    const [yourKeywords, competitorKeywords] = await Promise.all([
      fetchRankedKeywords(yourDomain, auth, 100),
      fetchRankedKeywords(competitorDomain, auth, 100)
    ]);

    // Find keyword gaps (keywords competitor ranks for but you don't)
    const yourKeywordSet = new Set(yourKeywords.map((k: any) => k.keyword));
    const keywordGaps = competitorKeywords
      .filter((k: any) => !yourKeywordSet.has(k.keyword))
      .slice(0, 5) // DEMO: Limit to 5 keywords
      .map((k: any) => ({
        keyword: k.keyword,
        position: k.rank_absolute,
        search_volume: k.search_volume || 0,
        cpc: k.cpc || 0
      }));

    // Fetch backlinks and on-page summaries
    const [yourBacklinks, competitorBacklinks, yourOnPage, competitorOnPage] = await Promise.all([
      fetchBacklinkSummary(yourDomain, auth),
      fetchBacklinkSummary(competitorDomain, auth),
      fetchOnPageSummary(yourDomain, auth),
      fetchOnPageSummary(competitorDomain, auth)
    ]);

    const result = {
      keyword_gap_list: keywordGaps,
      backlink_summary: {
        your_domain: yourBacklinks,
        competitor_domain: competitorBacklinks
      },
      onpage_summary: {
        your_domain: yourOnPage,
        competitor_domain: competitorOnPage
      },
      is_demo: true
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in competitor-analyze-demo:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchRankedKeywords(domain: string, auth: string, limit: number) {
  const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      target: domain,
      location_code: 2840,
      language_code: 'en',
      limit
    }])
  });

  const data = await response.json();
  if (data.tasks?.[0]?.result?.[0]?.items) {
    return data.tasks[0].result[0].items;
  }
  return [];
}

async function fetchBacklinkSummary(domain: string, auth: string) {
  const response = await fetch('https://api.dataforseo.com/v3/backlinks/summary/live', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      target: domain,
      include_subdomains: true
    }])
  });

  const data = await response.json();
  if (data.tasks?.[0]?.result?.[0]) {
    const result = data.tasks[0].result[0];
    return {
      backlinks: result.backlinks || 0,
      referring_domains: result.referring_domains || 0,
      referring_ips: result.referring_ips || 0
    };
  }
  return { backlinks: 0, referring_domains: 0, referring_ips: 0 };
}

async function fetchOnPageSummary(domain: string, auth: string) {
  const response = await fetch('https://api.dataforseo.com/v3/on_page/summary', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      id: domain
    }])
  });

  const data = await response.json();
  if (data.tasks?.[0]?.result?.[0]) {
    const result = data.tasks[0].result[0];
    return {
      pages_crawled: result.crawled_pages || 0,
      internal_links: result.links_internal || 0,
      external_links: result.links_external || 0,
      images: result.images || 0,
      tech_score: Math.round((result.crawled_pages / (result.crawled_pages + result.pages_with_errors || 1)) * 100)
    };
  }
  return { pages_crawled: 0, internal_links: 0, external_links: 0, images: 0, tech_score: 0 };
}
