/**
 * DataForSEO API Client
 * Handles authentication, rate limiting, and pagination for DataForSEO Labs v3
 */

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

export interface DataForSEOCredentials {
  login: string;
  password: string;
}

export interface DataForSEOResponse<T = any> {
  status_code: number;
  status_message: string;
  tasks?: Array<{
    result?: T[];
    status_code: number;
    status_message: string;
  }>;
}

export interface RankedKeyword {
  keyword: string;
  position: number;
  search_volume: number;
  cpc?: number;
  competition?: number;
  keyword_difficulty?: number;
}

export interface KeywordMetrics {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  keyword_difficulty: number;
}

export interface SerpFeatures {
  keyword: string;
  features: string[];
}

/**
 * Market to DataForSEO location code mapping
 */
export const MARKET_LOCATION_MAP: Record<string, number> = {
  'us': 2840,
  'uk': 2826,
  'ca': 2124,
  'au': 2036,
  'de': 2276,
  'fr': 2250,
  'es': 2724,
  'it': 2380,
  'br': 2076,
  'mx': 2484,
  'in': 2356,
  'jp': 2392,
};

/**
 * Freshness to hours mapping
 */
export const FRESHNESS_MAP: Record<string, number> = {
  'live': 0,
  '24h': 24,
  '7d': 168,
};

/**
 * Sleep helper for rate limiting
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Exponential backoff retry wrapper
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error
      if (error.status === 429 || error.statusCode === 40401) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(delay);
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Create Basic Auth header
 */
function getAuthHeader(credentials: DataForSEOCredentials): string {
  const encoded = btoa(`${credentials.login}:${credentials.password}`);
  return `Basic ${encoded}`;
}

/**
 * Main Labs API helper
 * Handles authentication, pagination, and error handling
 */
export async function labsRequest<T = any>(
  path: string,
  body: any,
  credentials: DataForSEOCredentials,
  options: {
    limit?: number;
    maxPages?: number;
  } = {}
): Promise<T[]> {
  const { limit = 1000, maxPages = 5 } = options;
  const url = `${DATAFORSEO_BASE_URL}/dataforseo_labs/${path}`;
  
  const results: T[] = [];
  let offset = 0;
  let hasMore = true;
  let page = 0;

  while (hasMore && page < maxPages) {
    const requestBody = [
      {
        ...body,
        limit,
        offset,
      }
    ];

    const response = await withRetry(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(credentials),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error: any = new Error(`DataForSEO API error: ${res.status} ${res.statusText}`);
        error.status = res.status;
        throw error;
      }

      return res.json();
    });

    const data = response as DataForSEOResponse<T>;
    
    if (data.status_code !== 20000) {
      throw new Error(`DataForSEO API error: ${data.status_message}`);
    }

    const taskResults = data.tasks?.[0]?.result || [];
    results.push(...taskResults);

    // Check if there are more results
    hasMore = taskResults.length === limit;
    offset += limit;
    page++;

    // Rate limit: wait between requests
    if (hasMore && page < maxPages) {
      await sleep(500);
    }
  }

  return results;
}

/**
 * Fetch ranked keywords for a domain
 */
export async function getDomainRankedKeywords(
  domain: string,
  locationCode: number,
  credentials: DataForSEOCredentials,
  options: {
    limit?: number;
    maxKeywords?: number;
  } = {}
): Promise<RankedKeyword[]> {
  const { limit = 1000, maxKeywords = 500 } = options;
  
  const results = await labsRequest<any>(
    'google/ranked_keywords/live',
    {
      target: domain,
      location_code: locationCode,
      language_code: 'en',
      load_rank_absolute: true,
      order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
    },
    credentials,
    { limit, maxPages: Math.ceil(maxKeywords / limit) }
  );

  return results.flatMap((item: any) => 
    (item.ranked_keywords || []).slice(0, maxKeywords).map((kw: any) => ({
      keyword: kw.keyword_data?.keyword || '',
      position: kw.ranked_serp_element?.serp_item?.rank_absolute || 0,
      search_volume: kw.keyword_data?.keyword_info?.search_volume || 0,
      cpc: kw.keyword_data?.keyword_info?.cpc || 0,
      competition: kw.keyword_data?.keyword_info?.competition || 0,
      keyword_difficulty: kw.keyword_data?.keyword_properties?.keyword_difficulty || 0,
    }))
  );
}

/**
 * Bulk fetch keyword metrics (difficulty, CPC, volume)
 */
export async function getBulkKeywordMetrics(
  keywords: string[],
  locationCode: number,
  credentials: DataForSEOCredentials
): Promise<KeywordMetrics[]> {
  // Process in batches of 100
  const batchSize = 100;
  const results: KeywordMetrics[] = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    
    const batchResults = await labsRequest<any>(
      'google/bulk_keyword_difficulty/live',
      {
        keywords: batch,
        location_code: locationCode,
        language_code: 'en',
      },
      credentials,
      { limit: batchSize, maxPages: 1 }
    );

    const metrics = batchResults.flatMap((item: any) =>
      (item.items || []).map((kw: any) => ({
        keyword: kw.keyword || '',
        search_volume: kw.keyword_info?.search_volume || 0,
        cpc: kw.keyword_info?.cpc || 0,
        competition: kw.keyword_info?.competition || 0,
        keyword_difficulty: kw.keyword_properties?.keyword_difficulty || 0,
      }))
    );

    results.push(...metrics);
    
    // Rate limit between batches
    if (i + batchSize < keywords.length) {
      await sleep(500);
    }
  }

  return results;
}

/**
 * Fetch SERP features for keywords
 */
export async function getKeywordSerpFeatures(
  keywords: string[],
  locationCode: number,
  credentials: DataForSEOCredentials
): Promise<SerpFeatures[]> {
  // Process in batches of 50
  const batchSize = 50;
  const results: SerpFeatures[] = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    
    const batchResults = await labsRequest<any>(
      'google/serp_competitors/live',
      {
        keywords: batch,
        location_code: locationCode,
        language_code: 'en',
      },
      credentials,
      { limit: batchSize, maxPages: 1 }
    );

    const features = batchResults.flatMap((item: any) =>
      (item.items || []).map((kw: any) => ({
        keyword: kw.keyword || '',
        features: (kw.serp_info?.features || []).map((f: any) => f.type || '').filter(Boolean),
      }))
    );

    results.push(...features);
    
    // Rate limit between batches
    if (i + batchSize < keywords.length) {
      await sleep(500);
    }
  }

  return results;
}
