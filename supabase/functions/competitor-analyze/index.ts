import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { callDataForSEO, DataForSEOError } from "../_shared/dataforseo/client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODULE_NAME = 'competitor-analyze';

const FREE_LIMIT = 3;

// Helper to return JSON responses
const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Normalize domain inputs (strip protocol, www, paths)
const normalize = (v: string) => {
  try {
    const u = new URL(v.trim());
    return u.hostname.replace(/^www\./, '');
  } catch {
    return v.trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*/, '');
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { yourDomain, competitorDomain, location_code, language_code, limit } = await req.json();
    const yourHost = normalize(yourDomain);
    const competitorHost = normalize(competitorDomain);
    
    // Validate and apply defaults
    let locationCode = 2840;
    if (location_code !== undefined && location_code !== null && location_code !== '') {
      const parsed = typeof location_code === 'number' ? location_code : parseInt(String(location_code), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        locationCode = parsed;
      } else {
        console.warn('Invalid location_code provided, using default 2840');
      }
    }
    
    let languageCode = 'en';
    if (language_code && typeof language_code === 'string') {
      const trimmed = language_code.trim();
      if (trimmed.length >= 2 && trimmed.length <= 10 && /^[a-z-]+$/.test(trimmed)) {
        languageCode = trimmed;
      } else {
        console.warn('Invalid language_code provided, using default "en"');
      }
    }
    
    let keywordLimit = 300;
    if (limit !== undefined && limit !== null && limit !== '') {
      const parsed = typeof limit === 'number' ? limit : parseInt(String(limit), 10);
      if (Number.isFinite(parsed) && parsed >= 50 && parsed <= 1000) {
        keywordLimit = parsed;
      } else {
        console.warn('Invalid limit provided (must be 50-1000), using default 300');
      }
    }
    
    if (!yourHost || !competitorHost) {
      return new Response(
        JSON.stringify({ error: 'Both domains are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error('No user found in auth header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Freemium quota check
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('free_reports_used, free_reports_renewal_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile query error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.error('Profile not found for user:', user.id);
      return json({ 
        ok: false, 
        code: 'PROFILE_MISSING', 
        message: 'Profile not found for this user. Try signing out/in to refresh.' 
      }, 200);
    }

    console.log('Profile loaded:', { 
      user_id: user.id, 
      free_reports_used: profile.free_reports_used,
      free_reports_renewal_at: profile.free_reports_renewal_at 
    });

    const now = new Date();
    const renewalDate = profile.free_reports_renewal_at ? new Date(profile.free_reports_renewal_at) : null;
    const needsRenewal = !renewalDate || now > renewalDate;
    
    let effectiveUsed = 0;
    let newRenewalDate = renewalDate;
    
    if (needsRenewal) {
      effectiveUsed = 0;
      newRenewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      console.log('Renewal needed - resetting usage counter');
    } else {
      effectiveUsed = profile.free_reports_used || 0;
    }

    console.log('Quota check:', { effectiveUsed, limit: FREE_LIMIT, needsRenewal });

    if (effectiveUsed >= FREE_LIMIT) {
      console.log('Limit exceeded for user:', user.id);
      return json({ 
        ok: false, 
        code: 'LIMIT_EXCEEDED', 
        message: 'Free limit reached. Please upgrade for more analyses.' 
      }, 200);
    }

    // Check cache first (24-hour cache)
    const expiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cachedData } = await supabaseClient
      .from('competitor_analysis')
      .select('*')
      .eq('user_id', user.id)
      .eq('your_domain', yourHost)
      .eq('competitor_domain', competitorHost)
      .gt('created_at', expiryTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedData) {
      console.log('Returning cached data');
      return new Response(
        JSON.stringify({
          keyword_gap_list: cachedData.keyword_gap_list,
          backlink_summary: cachedData.backlink_summary,
          onpage_summary: cachedData.onpage_summary,
          warnings: cachedData.warnings,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const warnings: string[] = [];
    
    // Fetch ranked keywords for both domains
    let yourKeywords: any[] = [];
    let competitorKeywords: any[] = [];
    
    try {
      yourKeywords = await fetchRankedKeywords(yourHost, user.id, locationCode, languageCode, keywordLimit);
    } catch (error) {
      console.warn('Failed to fetch ranked keywords for your domain:', error);
      warnings.push('keywords_your_domain_failed');
    }
    
    try {
      competitorKeywords = await fetchRankedKeywords(competitorHost, user.id, locationCode, languageCode, keywordLimit);
    } catch (error) {
      console.warn('Failed to fetch ranked keywords for competitor domain:', error);
      warnings.push('keywords_competitor_domain_failed');
    }

    // Find keyword gaps (keywords competitor ranks for but you don't)
    const yourKeywordSet = new Set(yourKeywords.map((k: any) => k.keyword));
    const keywordGaps = competitorKeywords
      .filter((k: any) => !yourKeywordSet.has(k.keyword))
      .map((k: any) => ({
        keyword: k.keyword,
        position: k.rank_absolute || k.rank || null,
        search_volume: k.search_volume || k.keyword_info?.search_volume || 0,
        cpc: k.cpc || 0,
        ranking_url: k.ranked_serp_element?.serp_item?.url || k.keyword_data?.url || null
      }));

    // Fetch backlinks
    let yourBacklinks = { backlinks: 0, referring_domains: 0, referring_ips: 0 };
    let competitorBacklinks = { backlinks: 0, referring_domains: 0, referring_ips: 0 };
    
    try {
      yourBacklinks = await fetchBacklinkSummary(yourHost, user.id);
    } catch (error) {
      console.warn('Failed to fetch backlinks for your domain:', error);
      warnings.push('backlinks_your_domain_failed');
    }
    
    try {
      competitorBacklinks = await fetchBacklinkSummary(competitorHost, user.id);
    } catch (error) {
      console.warn('Failed to fetch backlinks for competitor domain:', error);
      warnings.push('backlinks_competitor_domain_failed');
    }

    // Create On-Page tasks for both domains
    let yourOnPage = { pages_crawled: 0, internal_links: 0, external_links: 0, images: 0, tech_score: 0 };
    let competitorOnPage = { pages_crawled: 0, internal_links: 0, external_links: 0, images: 0, tech_score: 0 };
    
    try {
      const yourTaskId = await createOnPageTask(yourHost, user.id);
      yourOnPage = await getOnPageSummary(yourTaskId, user.id);
    } catch (error) {
      console.warn('On-Page data unavailable for your domain:', error);
      warnings.push('onpage_your_domain_unavailable');
    }

    try {
      const competitorTaskId = await createOnPageTask(competitorHost, user.id);
      competitorOnPage = await getOnPageSummary(competitorTaskId, user.id);
    } catch (error) {
      console.warn('On-Page data unavailable for competitor domain:', error);
      warnings.push('onpage_competitor_domain_unavailable');
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
      warnings: warnings.length > 0 ? warnings : undefined
    };

    // Store in cache
    await supabaseClient.from('competitor_analysis').insert({
      user_id: user.id,
      your_domain: yourHost,
      competitor_domain: competitorHost,
      keyword_gap_list: result.keyword_gap_list,
      backlink_summary: result.backlink_summary,
      onpage_summary: result.onpage_summary,
      warnings: result.warnings,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    // Update freemium usage
    const updateData = needsRenewal 
      ? { free_reports_used: 1, free_reports_renewal_at: newRenewalDate?.toISOString() }
      : { free_reports_used: effectiveUsed + 1 };

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update usage:', updateError);
    } else {
      console.log('Usage updated successfully:', updateData);
    }

    return new Response(
      JSON.stringify({ ...result, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in competitor-analyze:', error);
    
    // Handle DataForSEO specific errors (rate limit, credits)
    if (error instanceof DataForSEOError) {
      return new Response(
        JSON.stringify({ 
          error: error.message,
          error_code: error.isRateLimit ? 'RATE_LIMIT' : error.isCreditsExhausted ? 'CREDITS_EXHAUSTED' : 'API_ERROR',
        }),
        { 
          status: error.statusCode, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchRankedKeywords(domain: string, userId: string, locationCode: number = 2840, languageCode: string = 'en', limit: number = 300) {
  const data = await callDataForSEO({
    endpoint: '/dataforseo_labs/google/ranked_keywords/live',
    payload: [{
      target: domain,
      location_code: locationCode,
      language_code: languageCode,
      limit: limit
    }],
    module: MODULE_NAME,
    userId,
  });

  if (data.tasks?.[0]?.result?.[0]?.items) {
    return data.tasks[0].result[0].items;
  }
  return [];
}

async function fetchBacklinkSummary(domain: string, userId: string) {
  const data = await callDataForSEO({
    endpoint: '/backlinks/summary/live',
    payload: [{
      target: domain,
      include_subdomains: true
    }],
    module: MODULE_NAME,
    userId,
  });

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

async function createOnPageTask(domain: string, userId: string): Promise<string> {
  const data = await callDataForSEO({
    endpoint: '/v3/on_page/task_post',
    payload: [{
      target: `https://${domain}`,
      max_crawl_pages: 50,
      force_sitewide_checks: true
    }],
    module: MODULE_NAME,
    userId,
  });

  if (data.tasks?.[0]?.id) {
    return data.tasks[0].id;
  }
  throw new Error('Failed to create On-Page task');
}

async function getOnPageSummary(taskId: string, userId: string) {
  const maxPolls = 6;
  const pollDelay = 10000; // 10 seconds

  for (let i = 0; i < maxPolls; i++) {
    try {
      const data = await callDataForSEO({
        endpoint: `/v3/on_page/summary/${taskId}`,
        payload: [],
        module: MODULE_NAME,
        userId,
      });

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