/**
 * Credit and usage guardrails for competitor gap analysis
 */

export const CREDIT_LIMITS = {
  // Maximum keywords to fetch per domain
  MAX_KEYWORDS_PER_DOMAIN: 500,
  
  // Maximum keywords to enrich with difficulty/CPC data
  MAX_ENRICH_BATCH: 1000,
  
  // Maximum SERP features to fetch
  MAX_SERP_FEATURES: 200,
} as const;

export const PLAN_LIMITS = {
  starter: {
    name: 'Starter',
    maxJobsPerDay: 1,
    maxKeywords: 500,
  },
  pro: {
    name: 'Pro',
    maxJobsPerDay: 5,
    maxKeywords: 1000,
  },
  enterprise: {
    name: 'Enterprise',
    maxJobsPerDay: 20,
    maxKeywords: 5000,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

/**
 * Check if user has exceeded daily job limit
 */
export function canCreateJob(plan: PlanType, jobsToday: number): boolean {
  const limit = PLAN_LIMITS[plan];
  return jobsToday < limit.maxJobsPerDay;
}

/**
 * Get remaining jobs for today
 */
export function getRemainingJobs(plan: PlanType, jobsToday: number): number {
  const limit = PLAN_LIMITS[plan];
  return Math.max(0, limit.maxJobsPerDay - jobsToday);
}

/**
 * Get maximum keywords allowed for plan
 */
export function getMaxKeywords(plan: PlanType): number {
  return PLAN_LIMITS[plan].maxKeywords;
}

/**
 * Enforce credit limits on keyword fetching
 */
export function enforceKeywordLimit(requestedCount: number, plan?: PlanType): number {
  const planMax = plan ? getMaxKeywords(plan) : CREDIT_LIMITS.MAX_KEYWORDS_PER_DOMAIN;
  return Math.min(requestedCount, planMax, CREDIT_LIMITS.MAX_KEYWORDS_PER_DOMAIN);
}

/**
 * Enforce credit limits on enrichment batch
 */
export function enforceEnrichLimit(keywordCount: number): number {
  return Math.min(keywordCount, CREDIT_LIMITS.MAX_ENRICH_BATCH);
}

/**
 * Calculate estimated API cost for a comparison job
 */
export function estimateJobCost(options: {
  keywordsPerDomain: number;
  includeSerp: boolean;
  includeRelated: boolean;
}): {
  keywordFetches: number;
  enrichmentCalls: number;
  serpCalls: number;
  totalEstimate: number;
} {
  const keywordFetches = options.keywordsPerDomain * 2; // Both domains
  const enrichmentCalls = Math.min(options.keywordsPerDomain * 2, CREDIT_LIMITS.MAX_ENRICH_BATCH);
  const serpCalls = options.includeSerp ? CREDIT_LIMITS.MAX_SERP_FEATURES : 0;
  
  // Rough DataForSEO pricing estimates (adjust based on actual costs)
  const totalEstimate = keywordFetches * 0.01 + enrichmentCalls * 0.005 + serpCalls * 0.01;
  
  return {
    keywordFetches,
    enrichmentCalls,
    serpCalls,
    totalEstimate,
  };
}
