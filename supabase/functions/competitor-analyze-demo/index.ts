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

    // Fetch backlinks
    const [yourBacklinks, competitorBacklinks] = await Promise.all([
      fetchBacklinkSummary(yourDomain, auth),
      fetchBacklinkSummary(competitorDomain, auth)
    ]);

    // Create On-Page tasks and poll for results
    let yourOnPage;
    let competitorOnPage;
    
    try {
      const yourTaskId = await createOnPageTask(yourDomain, auth);
      yourOnPage = await getOnPageSummary(yourTaskId, auth);
    } catch (error) {
      console.warn('On-Page data unavailable for your domain:', error);
      yourOnPage = { pages_crawled: 0, internal_links: 0, external_links: 0, images: 0, tech_score: 0 };
    }

    try {
      const competitorTaskId = await createOnPageTask(competitorDomain, auth);
      competitorOnPage = await getOnPageSummary(competitorTaskId, auth);
    } catch (error) {
      console.warn('On-Page data unavailable for competitor domain:', error);
      competitorOnPage = { pages_crawled: 0, internal_links: 0, external_links: 0, images: 0, tech_score: 0 };
    }

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

async function createOnPageTask(domain: string, auth: string): Promise<string> {
  const response = await fetch('https://api.dataforseo.com/v3/on_page/task_post', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      target: `https://${domain}`,
      max_crawl_pages: 50,
      force_sitewide_checks: true
    }])
  });

  const data = await response.json();
  if (data.tasks?.[0]?.id) {
    return data.tasks[0].id;
  }
  throw new Error('Failed to create On-Page task');
}

async function getOnPageSummary(taskId: string, auth: string) {
  const maxPolls = 6;
  const pollDelay = 10000; // 10 seconds

  for (let i = 0; i < maxPolls; i++) {
    try {
      const response = await fetch(`https://api.dataforseo.com/v3/on_page/summary/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.tasks?.[0]?.result?.[0]) {
        const result = data.tasks[0].result[0];
        const crawlProgress = result.crawl_progress;

        // Check if crawl is finished
        if (crawlProgress === 'finished') {
          return {
            pages_crawled: result.crawled_pages || 0,
            internal_links: result.links_internal || 0,
            external_links: result.links_external || 0,
            images: result.images || 0,
            tech_score: result.onpage_score || 0
          };
        }

        // If not finished and not last poll, wait before next attempt
        if (i < maxPolls - 1) {
          console.log(`On-Page task ${taskId} not finished (${crawlProgress}), polling again in ${pollDelay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, pollDelay));
        }
      }
    } catch (error) {
      console.error(`Error polling On-Page task ${taskId}:`, error);
      if (i === maxPolls - 1) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, pollDelay));
    }
  }

  // If we've exhausted all polls without completion, return neutral object
  console.warn(`On-Page task ${taskId} did not complete after ${maxPolls} polls`);
  return { pages_crawled: 0, internal_links: 0, external_links: 0, images: 0, tech_score: 0 };
}
