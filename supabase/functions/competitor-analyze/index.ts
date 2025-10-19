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
    const { yourDomain, competitorDomain } = await req.json();
    const yourHost = normalize(yourDomain);
    const competitorHost = normalize(competitorDomain);
    
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
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ranked keywords for both domains
    const [yourKeywords, competitorKeywords] = await Promise.all([
      fetchRankedKeywords(yourHost, user.id),
      fetchRankedKeywords(competitorHost, user.id)
    ]);

    // Find keyword gaps (keywords competitor ranks for but you don't)
    const yourKeywordSet = new Set(yourKeywords.map((k: any) => k.keyword));
    const keywordGaps = competitorKeywords
      .filter((k: any) => !yourKeywordSet.has(k.keyword))
      .map((k: any) => ({
        keyword: k.keyword,
        position: k.rank_absolute,
        search_volume: k.search_volume || 0,
        cpc: k.cpc || 0
      }));

    // Fetch backlinks and on-page summaries
    const [yourBacklinks, competitorBacklinks, yourOnPage, competitorOnPage] = await Promise.all([
      fetchBacklinkSummary(yourHost, user.id),
      fetchBacklinkSummary(competitorHost, user.id),
      fetchOnPageSummary(yourHost, user.id),
      fetchOnPageSummary(competitorHost, user.id)
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
      }
    };

    // Store in cache
    await supabaseClient.from('competitor_analysis').insert({
      user_id: user.id,
      your_domain: yourHost,
      competitor_domain: competitorHost,
      keyword_gap_list: result.keyword_gap_list,
      backlink_summary: result.backlink_summary,
      onpage_summary: result.onpage_summary,
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

async function fetchRankedKeywords(domain: string, userId: string) {
  const data = await callDataForSEO({
    endpoint: '/dataforseo_labs/google/ranked_keywords/live',
    payload: [{
      target: domain,
      location_code: 2840,
      language_code: 'en',
      limit: 1000
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

async function fetchOnPageSummary(domain: string, userId: string) {
  const data = await callDataForSEO({
    endpoint: '/on_page/summary',
    payload: [{
      id: domain
    }],
    module: MODULE_NAME,
    userId,
  });

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