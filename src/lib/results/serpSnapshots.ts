import { supabase } from '@/integrations/supabase/client';

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  domain: string;
  type: 'blog' | 'product' | 'forum' | 'directory' | 'news' | 'video' | 'unknown';
  favicon?: string;
}

export interface SerpSnapshot {
  id: string;
  keyword: string;
  results: SerpResult[];
  capturedAt: string;
}

/**
 * Fetch the latest SERP snapshot for a keyword in a project
 */
export async function getSerpSnapshot(
  projectId: string,
  keyword: string
): Promise<SerpSnapshot | null> {
  try {
    const { data, error } = await supabase
      .from('serp_snapshots')
      .select('id, keyword_text, snapshot_json, created_at')
      .eq('project_id', projectId)
      .eq('keyword_text', keyword)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('No SERP snapshot found:', error);
      return null;
    }

    return {
      id: data.id,
      keyword: data.keyword_text,
      results: (data.snapshot_json as any)?.results || [],
      capturedAt: data.created_at,
    };
  } catch (error) {
    console.error('Error fetching SERP snapshot:', error);
    return null;
  }
}

/**
 * Classify result type based on URL and domain patterns
 */
export function classifyResultType(url: string, domain: string): SerpResult['type'] {
  const urlLower = url.toLowerCase();
  const domainLower = domain.toLowerCase();

  // Product/Shopping indicators
  if (
    urlLower.includes('/product') ||
    urlLower.includes('/shop') ||
    urlLower.includes('/buy') ||
    domainLower.includes('amazon') ||
    domainLower.includes('ebay') ||
    domainLower.includes('shop')
  ) {
    return 'product';
  }

  // Forum indicators
  if (
    domainLower.includes('reddit') ||
    domainLower.includes('quora') ||
    domainLower.includes('forum') ||
    domainLower.includes('stackexchange') ||
    urlLower.includes('/forum')
  ) {
    return 'forum';
  }

  // Video indicators
  if (
    domainLower.includes('youtube') ||
    domainLower.includes('vimeo') ||
    urlLower.includes('/video') ||
    urlLower.includes('/watch')
  ) {
    return 'video';
  }

  // News indicators
  if (
    domainLower.includes('news') ||
    domainLower.includes('cnn') ||
    domainLower.includes('bbc') ||
    domainLower.includes('nytimes') ||
    urlLower.includes('/news/')
  ) {
    return 'news';
  }

  // Directory indicators
  if (
    domainLower.includes('yelp') ||
    domainLower.includes('yellowpages') ||
    domainLower.includes('directory') ||
    urlLower.includes('/directory')
  ) {
    return 'directory';
  }

  // Blog indicators (common blog platforms and patterns)
  if (
    urlLower.includes('/blog') ||
    domainLower.includes('medium') ||
    domainLower.includes('wordpress') ||
    domainLower.includes('blogger')
  ) {
    return 'blog';
  }

  return 'unknown';
}

/**
 * Get favicon URL for a domain
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Enhance SERP results with type classification and favicons
 */
export function enhanceSerpResults(results: any[]): SerpResult[] {
  return results.map((result, index) => ({
    position: result.position || index + 1,
    title: result.title || 'Untitled',
    url: result.url || '',
    domain: result.domain || new URL(result.url || 'https://example.com').hostname,
    type: result.type || classifyResultType(result.url || '', result.domain || ''),
    favicon: getFaviconUrl(result.domain || new URL(result.url || 'https://example.com').hostname),
  }));
}
