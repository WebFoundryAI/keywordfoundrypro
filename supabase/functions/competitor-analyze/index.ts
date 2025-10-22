import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { callDataForSEO, DataForSEOError } from "../_shared/dataforseo/client.ts";
import { retryFetch } from "../_shared/retry.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODULE_NAME = 'competitor-analyze';

const FREE_LIMIT = 3;

// Helper to extract compact error details for debugging (max 600 chars, no secrets)
const extractErrorDetails = (error: any, stage: string): string => {
  try {
    let details = '';
    
    // If it's a DataForSEO error with response data
    if (error?.response) {
      const resp = error.response;
      details += `status:${resp.status || 'unknown'}`;
      if (resp.status_message) details += ` msg:"${resp.status_message.slice(0, 100)}"`;
      if (resp.tasks?.[0]) {
        const task = resp.tasks[0];
        if (task.status_code) details += ` task_code:${task.status_code}`;
        if (task.status_message) details += ` task_msg:"${task.status_message.slice(0, 100)}"`;
      }
    }
    
    // If it's a fetch/HTTP error with status
    if (error?.status) {
      details += `http_status:${error.status}`;
    }
    
    // Add error message
    const msg = String(error?.message || error || 'unknown');
    if (msg && !details.includes(msg.slice(0, 50))) {
      details += ` err:"${msg.slice(0, 150)}"`;
    }
    
    // Add stage context
    details = `[${stage}] ${details}`;
    
    return details.slice(0, 600);
  } catch {
    return `[${stage}] error_parse_failed`;
  }
};

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

// Compute checksum for cache deduplication
const computeChecksum = async (
  yourDomain: string,
  competitorDomain: string,
  locationCode: number,
  languageCode: string,
  limit: number
): Promise<string> => {
  const payload = `${yourDomain.toLowerCase()}|${competitorDomain.toLowerCase()}|${locationCode}|${languageCode}|${limit}`;
  const msgUint8 = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const request_id = crypto.randomUUID?.() || (Date.now() + '-' + Math.random().toString(16).slice(2));
  const warnings: string[] = [];

  try {
    const body = await req.json();
    
    // Health check endpoint
    if (body.op === 'health') {
      return json({
        ok: true,
        request_id,
        warnings: [],
        data: {
          d4s_creds_present: !!(Deno.env.get('DATAFORSEO_LOGIN') && Deno.env.get('DATAFORSEO_PASSWORD'))
        }
      }, 200);
    }
    
    const { yourDomain, competitorDomain } = body;
    const yourHost = normalize(yourDomain);
    const competitorHost = normalize(competitorDomain);
    
    // Sanitize and validate parameters with fallback tracking
    const loc = Number.isFinite(+body.location_code) && +body.location_code > 0 
      ? Math.floor(+body.location_code) 
      : 2840;
    if (body.location_code !== undefined && loc !== +body.location_code) {
      warnings.push('param_location_code_fallback');
    }
    
    const lang = (typeof body.language_code === 'string' && /^[a-z-]{2,10}$/i.test(body.language_code))
      ? body.language_code.toLowerCase()
      : 'en';
    if (body.language_code !== undefined && lang !== body.language_code?.toLowerCase()) {
      warnings.push('param_language_code_fallback');
    }
    
    const lim = Number.isFinite(+body.limit)
      ? Math.min(Math.max(Math.floor(+body.limit), 50), 1000)
      : 300;
    if (body.limit !== undefined && lim !== +body.limit) {
      warnings.push('param_limit_fallback');
    }
    
    // Check if using default parameters (for caching)
    const isDefaultParams = loc === 2840 && lang === 'en' && lim === 300;
    
    if (!yourHost || !competitorHost) {
      return json({ 
        ok: false, 
        request_id, 
        warnings, 
        error: { stage: 'validation', message: 'Both domains are required' } 
      }, 200);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ 
        ok: false, 
        request_id, 
        warnings, 
        error: { stage: 'auth', message: 'Missing authorization header' } 
      }, 200);
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr) {
      console.error('[competitor-analyze]', request_id, 'authErr', authErr);
      return json({ 
        ok: false, 
        request_id, 
        warnings, 
        error: { stage: 'auth', message: 'Unauthorized' } 
      }, 200);
    }
    if (!user) {
      console.error('[competitor-analyze]', request_id, 'auth', 'No user found in auth header');
      return json({ 
        ok: false, 
        request_id, 
        warnings, 
        error: { stage: 'auth', message: 'Unauthorized' } 
      }, 200);
    }

    console.log('User authenticated:', user.id);

    // Freemium quota check
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('free_reports_used, free_reports_renewal_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[competitor-analyze]', request_id, 'profile', profileError);
      return json({ 
        ok: false, 
        request_id, 
        warnings, 
        error: { stage: 'profile', message: 'Failed to fetch profile' } 
      }, 200);
    }

    if (!profile) {
      console.error('[competitor-analyze]', request_id, 'profile', 'Profile not found for user:', user.id);
      return json({ 
        ok: false, 
        request_id, 
        warnings, 
        error: { stage: 'profile', message: 'Profile not found for this user. Try signing out/in to refresh.' } 
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
      console.log('[competitor-analyze]', request_id, 'quota', 'Limit exceeded for user:', user.id);
      return json({ 
        ok: false, 
        request_id, 
        warnings, 
        error: { stage: 'quota', message: 'Free limit reached. Please upgrade for more analyses.' } 
      }, 200);
    }
    
    // Only use cache for default parameters to avoid mixing results
    let cachedData = null;
    let cachedEntry = null;
    
    if (isDefaultParams) {
      // Compute checksum for cache deduplication
      const checksum = await computeChecksum(yourHost, competitorHost, loc, lang, lim);
      console.log('Request checksum:', checksum);

      // Check competitor_cache for recent identical request (24-hour window)
      const cacheExpiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: entry } = await supabaseClient
        .from('competitor_cache')
        .select('payload')
        .eq('checksum', checksum)
        .gt('created_at', cacheExpiryTime)
        .maybeSingle();

      if (entry) {
        console.log('[competitor-analyze]', request_id, 'Cache hit - returning cached payload');
        return json({
          ok: true,
          request_id,
          warnings: ['cache_hit'],
          data: {
            ...entry.payload,
            cached: true
          }
        }, 200);
      }

      // Check cache first (24-hour cache)
      const expiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabaseClient
        .from('competitor_analysis')
        .select('*')
        .eq('user_id', user.id)
        .eq('your_domain', yourHost)
        .eq('competitor_domain', competitorHost)
        .gt('created_at', expiryTime)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        console.log('[competitor-analyze]', request_id, 'Returning cached data');
        return json({
          ok: true,
          request_id,
          warnings: data.warnings || [],
          data: {
            keyword_gap_list: data.keyword_gap_list,
            backlink_summary: data.backlink_summary,
            onpage_summary: data.onpage_summary,
            cached: true
          }
        }, 200);
      }
    } else {
      console.log('Cache bypassed due to custom parameters');
      warnings.push('cache_bypass_custom_params');
    }
    
    // Fetch ranked keywords for both domains
    let yourKeywords: any[] = [];
    let competitorKeywords: any[] = [];
    
    try {
      yourKeywords = await fetchRankedKeywords(yourHost, user.id, loc, lang, lim);
    } catch (error: any) {
      const excerpt = extractErrorDetails(error, 'keywords_your_domain');
      console.error('[d4s]', request_id, 'keywords_your_domain', excerpt);
      warnings.push('keywords_your_domain_failed');
    }
    
    try {
      competitorKeywords = await fetchRankedKeywords(competitorHost, user.id, loc, lang, lim);
    } catch (error: any) {
      const excerpt = extractErrorDetails(error, 'keywords_competitor');
      console.error('[d4s]', request_id, 'keywords_competitor', excerpt);
      warnings.push('keywords_competitor_domain_failed');
    }

    // Find keyword gaps (keywords competitor ranks for but you don't)
    const yourKeywordSet = new Set(yourKeywords.map((k: any) => k.keyword));
    const keywordGaps = competitorKeywords
      .filter((k: any) => !yourKeywordSet.has(k.keyword))
      .map((k: any) => {
        const url = k?.ranked_serp_element?.serp_item?.url || k?.url || null;
        return {
          keyword: k.keyword,
          competitor_rank: k.rank_absolute || k.rank,
          search_volume: k.search_volume || 0,
          competitor_url: url
        };
      });

    // Format all keywords for both domains
    const yourKeywordsList = yourKeywords.map((k: any) => ({
      keyword: k.keyword,
      rank: k.rank_absolute || k.rank || 0,
      search_volume: k.search_volume || 0,
      url: k?.ranked_serp_element?.serp_item?.url || k?.url || null
    }));

    const competitorKeywordsList = competitorKeywords.map((k: any) => ({
      keyword: k.keyword,
      rank: k.rank_absolute || k.rank || 0,
      search_volume: k.search_volume || 0,
      url: k?.ranked_serp_element?.serp_item?.url || k?.url || null
    }));

    // Fetch backlinks
    let yourBacklinks = { backlinks: 0, referring_domains: 0, referring_ips: 0 };
    let competitorBacklinks = { backlinks: 0, referring_domains: 0, referring_ips: 0 };
    
    try {
      yourBacklinks = await fetchBacklinkSummary(yourHost, user.id);
    } catch (error: any) {
      const excerpt = extractErrorDetails(error, 'backlinks_your_domain');
      console.error('[d4s]', request_id, 'backlinks_your_domain', excerpt);
      warnings.push('backlinks_your_domain_failed');
    }
    
    try {
      competitorBacklinks = await fetchBacklinkSummary(competitorHost, user.id);
    } catch (error: any) {
      const excerpt = extractErrorDetails(error, 'backlinks_competitor');
      console.error('[d4s]', request_id, 'backlinks_competitor', excerpt);
      warnings.push('backlinks_competitor_domain_failed');
    }

    // Create On-Page tasks for both domains
    const auth = btoa(`${Deno.env.get('DATAFORSEO_LOGIN')}:${Deno.env.get('DATAFORSEO_PASSWORD')}`);
    const yourOnPage = await fetchOnPageSummary(yourHost, auth, warnings, request_id);
    const competitorOnPage = await fetchOnPageSummary(competitorHost, auth, warnings, request_id);

    // Format all keywords for both domains
    const yourKeywordsList = yourKeywords.map((k: any) => ({
      keyword: k.keyword,
      rank: k.rank_absolute || k.rank || 0,
      search_volume: k.search_volume || 0,
      url: k?.ranked_serp_element?.serp_item?.url || k?.url || null
    }));

    const competitorKeywordsList = competitorKeywords.map((k: any) => ({
      keyword: k.keyword,
      rank: k.rank_absolute || k.rank || 0,
      search_volume: k.search_volume || 0,
      url: k?.ranked_serp_element?.serp_item?.url || k?.url || null
    }));

    const result = {
      your_keywords: yourKeywordsList,
      competitor_keywords: competitorKeywordsList,
      keyword_gap_list: keywordGaps,
      backlink_summary: {
        your_domain: yourBacklinks,
        competitor_domain: competitorBacklinks
      },
      onpage_summary: {
        your_domain: yourOnPage,
        competitor_domain: competitorOnPage
      },
      warnings
    };

    // Store in cache only if using default parameters
    if (isDefaultParams) {
      // Store in competitor_analysis table (only stores gaps for backwards compatibility)
      await supabaseClient.from('competitor_analysis').insert({
        user_id: user.id,
        your_domain: yourHost,
        competitor_domain: competitorHost,
        keyword_gap_list: result.keyword_gap_list,
        backlink_summary: result.backlink_summary,
        onpage_summary: result.onpage_summary,
        warnings: result.warnings,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }).catch(err => {
        // Log but don't fail - cache storage is not critical
        console.error('Failed to store in competitor_analysis table:', err);
      });

      // Store in competitor_cache only if no warnings (full success)
      if (warnings.length === 0 || (warnings.length === 1 && warnings[0] === 'cache_bypass_custom_params')) {
        const checksum = await computeChecksum(yourHost, competitorHost, loc, lang, lim);
        console.log('Storing result in competitor_cache with checksum:', checksum);
        await supabaseClient.from('competitor_cache').upsert({
          user_id: user.id,
          checksum: checksum,
          payload: result
        }, {
          onConflict: 'checksum'
        });
      } else {
        console.log('Skipping cache storage due to warnings:', warnings);
      }
    } else {
      console.log('Skipping cache storage due to custom parameters');
    }

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

    return json({
      ok: true,
      request_id,
      warnings,
      data: {
        ...result,
        cached: false
      }
    }, 200);

  } catch (error: any) {
    const excerpt = extractErrorDetails(error, 'handler');
    console.error('[d4s]', request_id, 'handler', excerpt);
    
    // Handle DataForSEO specific errors (rate limit, credits)
    if (error instanceof DataForSEOError) {
      return json({
        ok: false,
        request_id,
        warnings,
        error: {
          stage: 'dataforseo',
          message: error.message,
          code: error.isRateLimit ? 'RATE_LIMIT' : error.isCreditsExhausted ? 'CREDITS_EXHAUSTED' : 'API_ERROR',
          details: excerpt
        }
      }, 200);
    }
    
    return json({
      ok: false,
      request_id,
      warnings,
      error: {
        stage: 'unknown',
        message: String(error?.message || error),
        details: excerpt
      }
    }, 200);
  }
});

function extractTaskId(data: any): string | null {
  try {
    return data?.tasks?.[0]?.result?.[0]?.id
        || data?.tasks?.[0]?.id
        || data?.tasks?.[0]?.result?.[0]?.task_id
        || null;
  } catch { return null; }
}

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

async function createOnPageTask(domain: string, auth: string, request_id: string): Promise<string> {
  const body = [{
    target: `https://${domain}`,
    max_crawl_pages: 50,
    force_sitewide_checks: true
  }];
  const res = await retryFetch('https://api.dataforseo.com/v3/on_page/task_post', {
    method: 'POST',
    headers: { 
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const text = await res.text();
    let excerpt = `status:${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.status_message) excerpt += ` msg:"${json.status_message.slice(0, 100)}"`;
      if (json.tasks?.[0]?.status_message) excerpt += ` task:"${json.tasks[0].status_message.slice(0, 100)}"`;
    } catch {}
    console.error('[d4s]', request_id, 'onpage_task_post', excerpt);
    throw new Error(`onpage_task_post_failed: ${excerpt}`);
  }
  
  const data = await res.json();
  const id = extractTaskId(data);
  if (!id) {
    console.error('[d4s]', request_id, 'onpage_task_id_missing', JSON.stringify(data).slice(0, 300));
    throw new Error('onpage_task_id_missing');
  }
  return id;
}

async function getOnPageSummary(taskId: string, auth: string, request_id: string) {
  const url = `https://api.dataforseo.com/v3/on_page/summary/${taskId}`;
  const res = await retryFetch(url, { 
    headers: { 
      'Authorization': `Basic ${auth}`
    } 
  });
  
  if (!res.ok) {
    const text = await res.text();
    let excerpt = `status:${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.status_message) excerpt += ` msg:"${json.status_message.slice(0, 100)}"`;
    } catch {}
    console.error('[d4s]', request_id, 'onpage_summary', excerpt);
    throw new Error(`onpage_summary_failed: ${excerpt}`);
  }
  
  const data = await res.json();
  const r = data?.tasks?.[0]?.result?.[0];
  if (!r) {
    console.error('[d4s]', request_id, 'onpage_summary_unavailable', JSON.stringify(data).slice(0, 300));
    throw new Error('onpage_summary_unavailable');
  }
  return {
    pages_crawled: r.crawled_pages || 0,
    internal_links: r.links_internal || 0,
    external_links: r.links_external || 0,
    images: r.images || 0,
    tech_score: r.onpage_score ?? Math.round((r.crawled_pages / ((r.crawled_pages + (r.pages_with_errors || 0)) || 1)) * 100)
  };
}

async function fetchOnPageSummary(domain: string, auth: string, warnings: string[], request_id: string) {
  try {
    const taskId = await createOnPageTask(domain, auth, request_id);
    // poll up to 6 times with 10s delay until summary is present
    for (let i = 0; i < 6; i++) {
      try { return await getOnPageSummary(taskId, auth, request_id); }
      catch (e) { 
        if (i < 5) await new Promise(r => setTimeout(r, 10000)); 
      }
    }
    throw new Error('onpage_poll_timeout');
  } catch (e: any) {
    const msg = String(e?.message || e) || 'onpage_unknown_error';
    const excerpt = extractErrorDetails(e, 'onpage');
    console.error('[d4s]', request_id, 'onpage', excerpt);
    warnings.push(msg.slice(0, 100));
    return { pages_crawled: 0, internal_links: 0, external_links: 0, images: 0, tech_score: 0 };
  }
}