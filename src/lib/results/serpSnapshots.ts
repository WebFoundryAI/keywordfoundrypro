/**
 * FEATURE DISABLED: serp_snapshots table does not exist in database
 * These functions return null/empty and log warnings
 */

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
  keyword_text: string;
  snapshot_json: any;
  created_at: string;
  results?: SerpResult[];
  capturedAt?: string;
}

export async function getSerpSnapshot(
  keyword: string,
  researchId: string
): Promise<SerpSnapshot | null> {
  console.warn('SERP snapshots feature is disabled - serp_snapshots table does not exist');
  return null;
}

export async function saveSerpSnapshot(
  keyword: string,
  researchId: string,
  serpData: any
): Promise<{ success: boolean; error?: string }> {
  console.warn('SERP snapshots feature is disabled - serp_snapshots table does not exist');
  return { success: false, error: 'Feature not available' };
}

export function enhanceSerpResults(results: any[]): SerpResult[] {
  return [];
}

export function classifyResultType(url: string, domain: string): SerpResult['type'] {
  return 'unknown';
}

export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}
