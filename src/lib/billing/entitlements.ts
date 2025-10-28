/**
 * Plan entitlements and feature flags
 * Used by server guards and UI to enforce and display limits
 */

export type PlanId = 'free' | 'trial' | 'pro' | 'enterprise';

export interface PlanFeatures {
  basicKeywordResearch: boolean;
  serpAnalysis: boolean;
  competitorAnalysis: boolean;
  aiInsights: boolean;
  csvExport: boolean;
  apiAccess: boolean;
  prioritySupport?: boolean;
  customIntegrations?: boolean;
  dedicatedAccount?: boolean;
}

export interface PlanEntitlements {
  planId: PlanId;
  planName: string;
  queriesPerDay: number; // -1 = unlimited
  monthlyCredits: number; // -1 = unlimited
  maxRowsPerExport: number; // -1 = unlimited
  maxDepth: number;
  features: PlanFeatures;
}

/**
 * Plan definitions matching database config
 */
export const PLANS: Record<PlanId, PlanEntitlements> = {
  free: {
    planId: 'free',
    planName: 'Free',
    queriesPerDay: 5,
    monthlyCredits: 100,
    maxRowsPerExport: 100,
    maxDepth: 1,
    features: {
      basicKeywordResearch: true,
      serpAnalysis: false,
      competitorAnalysis: false,
      aiInsights: false,
      csvExport: true,
      apiAccess: false,
    },
  },
  trial: {
    planId: 'trial',
    planName: 'Trial',
    queriesPerDay: 50,
    monthlyCredits: 500,
    maxRowsPerExport: 1000,
    maxDepth: 3,
    features: {
      basicKeywordResearch: true,
      serpAnalysis: true,
      competitorAnalysis: true,
      aiInsights: true,
      csvExport: true,
      apiAccess: false,
    },
  },
  pro: {
    planId: 'pro',
    planName: 'Pro',
    queriesPerDay: 200,
    monthlyCredits: 2000,
    maxRowsPerExport: 10000,
    maxDepth: 5,
    features: {
      basicKeywordResearch: true,
      serpAnalysis: true,
      competitorAnalysis: true,
      aiInsights: true,
      csvExport: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    planId: 'enterprise',
    planName: 'Enterprise',
    queriesPerDay: -1, // unlimited
    monthlyCredits: -1, // unlimited
    maxRowsPerExport: -1, // unlimited
    maxDepth: 10,
    features: {
      basicKeywordResearch: true,
      serpAnalysis: true,
      competitorAnalysis: true,
      aiInsights: true,
      csvExport: true,
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: true,
      dedicatedAccount: true,
    },
  },
};

/**
 * Get plan entitlements by plan ID
 * @param planId - Plan identifier
 * @returns Plan entitlements or free tier if invalid
 */
export function getEntitlements(planId: string): PlanEntitlements {
  const normalized = planId.toLowerCase() as PlanId;
  return PLANS[normalized] || PLANS.free;
}

/**
 * Check if a limit is unlimited
 * @param value - Limit value
 * @returns true if unlimited (-1)
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Check if usage exceeds limit
 * @param usage - Current usage
 * @param limit - Plan limit
 * @returns true if over limit (ignores unlimited limits)
 */
export function isOverLimit(usage: number, limit: number): boolean {
  if (isUnlimited(limit)) return false;
  return usage >= limit;
}

/**
 * Calculate usage percentage
 * @param usage - Current usage
 * @param limit - Plan limit
 * @returns Percentage (0-100, capped at 100)
 */
export function getUsagePercentage(usage: number, limit: number): number {
  if (isUnlimited(limit)) return 0;
  if (limit === 0) return 100;
  return Math.min(Math.round((usage / limit) * 100), 100);
}

/**
 * Get warning level based on usage
 * @param usage - Current usage
 * @param limit - Plan limit
 * @returns 'none' | 'warning' | 'critical'
 */
export function getUsageLevel(
  usage: number,
  limit: number
): 'none' | 'warning' | 'critical' {
  const percentage = getUsagePercentage(usage, limit);
  if (percentage >= 100) return 'critical';
  if (percentage >= 80) return 'warning';
  return 'none';
}

/**
 * Stripe price ID mapping (configure in environment)
 * Maps Stripe price IDs to plan IDs
 */
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanId> = {
  // Example mappings - replace with actual Stripe price IDs
  price_free: 'free',
  price_trial: 'trial',
  price_pro_monthly: 'pro',
  price_pro_yearly: 'pro',
  price_enterprise: 'enterprise',
};

/**
 * Map Stripe price ID to plan ID
 * @param priceId - Stripe price ID
 * @returns Plan ID or 'free' if not found
 */
export function getPlanFromStripePrice(priceId: string): PlanId {
  return STRIPE_PRICE_TO_PLAN[priceId] || 'free';
}
