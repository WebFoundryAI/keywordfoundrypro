// Normalize DataForSEO SERP API response to position

export interface SerpItem {
  type: string;
  rank_group?: number;
  rank_absolute?: number;
  url?: string;
  domain?: string;
}

export interface RankResult {
  position: number | null;
  url: string | null;
  found: boolean;
}

/**
 * Find the position of a domain in SERP results
 */
export function findDomainPosition(
  results: SerpItem[],
  targetDomain: string
): RankResult {
  // Normalize target domain
  const normalizedTarget = normalizeDomain(targetDomain);

  for (const item of results) {
    // Only consider organic results
    if (item.type !== 'organic') {
      continue;
    }

    const itemDomain = item.domain || extractDomain(item.url || '');
    const normalizedItem = normalizeDomain(itemDomain);

    if (normalizedItem === normalizedTarget) {
      return {
        position: item.rank_absolute || item.rank_group || null,
        url: item.url || null,
        found: true,
      };
    }
  }

  return {
    position: null,
    url: null,
    found: false,
  };
}

/**
 * Normalize domain (remove www, lowercase)
 */
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return '';
  }
}

/**
 * Map DataForSEO response to rank results
 */
export function mapSerpToRanks(
  serpResponse: any,
  targetDomain: string
): RankResult {
  if (!serpResponse || !serpResponse.items || !Array.isArray(serpResponse.items)) {
    return { position: null, url: null, found: false };
  }

  return findDomainPosition(serpResponse.items, targetDomain);
}
