/**
 * Page-local adapter for Competitor Analyzer AI Insights responses
 * Tolerates schema variations from the Edge Function without breaking the UI
 */

export interface NormalizedInsightsResponse {
  ok: boolean;
  summary?: string;
  report?: string;
  competitors?: Array<{
    domain: string;
    metrics?: Record<string, any>;
  }>;
  tables?: Array<any>;
  meta?: {
    requestId?: string;
    durationMs?: number;
    timestamp?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Normalizes raw Edge Function response to consistent schema
 * Handles field name variations, missing data, and empty arrays gracefully
 */
export function parseCompetitorInsights(raw: any): NormalizedInsightsResponse {
  // Handle null/undefined responses
  if (!raw) {
    return {
      ok: false,
      error: {
        code: 'NO_RESPONSE',
        message: 'No response received from AI insights service'
      }
    };
  }

  // Handle explicit error responses
  if (raw.error || raw.code) {
    return {
      ok: false,
      error: {
        code: raw.code || 'UNKNOWN_ERROR',
        message: raw.error || raw.message || 'An error occurred',
        details: {
          requestId: raw.requestId || raw.meta?.requestId,
          ...(raw.missing && { missing: raw.missing }),
          ...(raw.limits && { limits: raw.limits })
        }
      },
      meta: raw.meta || { requestId: raw.requestId }
    };
  }

  // Extract report/summary - handle multiple field name variations
  const report = raw.report || raw.summary || raw.insights || raw.text || null;
  
  // Extract competitors array - handle variations and empty arrays
  let competitors = raw.competitors || raw.items || raw.domains || [];
  if (!Array.isArray(competitors)) {
    competitors = [];
  }
  
  // Extract tables array - handle variations and empty arrays
  let tables = raw.tables || raw.data || raw.results || [];
  if (!Array.isArray(tables)) {
    tables = [];
  }

  // Extract metadata with fallbacks
  const meta = {
    requestId: raw.meta?.requestId || raw.requestId || raw.request_id,
    durationMs: raw.meta?.durationMs || raw.durationMs || raw.duration,
    timestamp: raw.meta?.timestamp || raw.timestamp || new Date().toISOString()
  };

  // Return normalized success response
  return {
    ok: true,
    report,
    summary: raw.summary?.keyword_gaps_count !== undefined 
      ? `Found ${raw.summary.keyword_gaps_count} keyword gaps for ${raw.summary.competitor_domain}`
      : undefined,
    competitors,
    tables,
    meta
  };
}

/**
 * Validates that insights response has meaningful data
 * Returns true if there's at least a report or some data to display
 */
export function hasInsightsData(normalized: NormalizedInsightsResponse): boolean {
  if (!normalized.ok) return false;
  
  return !!(
    normalized.report || 
    (normalized.competitors && normalized.competitors.length > 0) ||
    (normalized.tables && normalized.tables.length > 0)
  );
}
