import { supabase } from '@/integrations/supabase/client';
import { getEntitlements, type PlanId } from '@/lib/billing/entitlements';

// Typed error for limit enforcement
export class LimitExceededError extends Error {
  constructor(
    message: string,
    public readonly limitType: 'queries_per_day' | 'monthly_credits' | 'feature_disabled',
    public readonly currentUsage: number,
    public readonly limit: number
  ) {
    super(message);
    this.name = 'LimitExceededError';
  }
}

export class FeatureDisabledError extends Error {
  constructor(message: string, public readonly feature: string) {
    super(message);
    this.name = 'FeatureDisabledError';
  }
}

interface UsageCheck {
  allowed: boolean;
  error?: LimitExceededError | FeatureDisabledError;
  remainingQueries?: number;
  remainingCredits?: number;
}

/**
 * Check if user can perform a query based on their plan limits
 */
export async function checkQueryLimit(userId: string): Promise<UsageCheck> {
  try {
    // Get user's current plan
    const { data: limitsData, error: limitsError } = await supabase
      .from('user_limits')
      .select('plan_id, queries_today, last_query_reset')
      .eq('user_id', userId)
      .single();

    if (limitsError || !limitsData) {
      console.error('Failed to fetch user limits:', limitsError);
      return { allowed: false, error: new LimitExceededError('Unable to verify limits', 'queries_per_day', 0, 0) };
    }

    const entitlements = getEntitlements(limitsData.plan_id as PlanId);

    // Check if unlimited
    if (entitlements.queriesPerDay === -1) {
      return { allowed: true };
    }

    // Reset daily counter if needed
    const lastReset = new Date(limitsData.last_query_reset);
    const now = new Date();
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    let currentQueries = limitsData.queries_today;

    if (daysSinceReset >= 1) {
      // Reset counter
      currentQueries = 0;
      await supabase
        .from('user_limits')
        .update({
          queries_today: 0,
          last_query_reset: now.toISOString(),
        })
        .eq('user_id', userId);
    }

    // Check limit
    if (currentQueries >= entitlements.queriesPerDay) {
      return {
        allowed: false,
        error: new LimitExceededError(
          `Daily query limit exceeded. You have reached the maximum of ${entitlements.queriesPerDay} queries per day for your ${entitlements.planName} plan.`,
          'queries_per_day',
          currentQueries,
          entitlements.queriesPerDay
        ),
      };
    }

    return {
      allowed: true,
      remainingQueries: entitlements.queriesPerDay - currentQueries,
    };
  } catch (error) {
    console.error('Error checking query limit:', error);
    return {
      allowed: false,
      error: new LimitExceededError('System error checking limits', 'queries_per_day', 0, 0),
    };
  }
}

/**
 * Check if user has sufficient credits for an operation
 */
export async function checkCreditLimit(userId: string, requiredCredits: number): Promise<UsageCheck> {
  try {
    // Get user's current plan and credit usage
    const { data: limitsData, error: limitsError } = await supabase
      .from('user_limits')
      .select('plan_id, credits_used_this_month, credits_reset_at')
      .eq('user_id', userId)
      .single();

    if (limitsError || !limitsData) {
      console.error('Failed to fetch user limits:', limitsError);
      return {
        allowed: false,
        error: new LimitExceededError('Unable to verify credits', 'monthly_credits', 0, 0),
      };
    }

    const entitlements = getEntitlements(limitsData.plan_id as PlanId);

    // Check if unlimited
    if (entitlements.monthlyCredits === -1) {
      return { allowed: true };
    }

    // Reset monthly counter if needed
    const resetAt = new Date(limitsData.credits_reset_at);
    const now = new Date();

    let currentCredits = limitsData.credits_used_this_month;

    if (now > resetAt) {
      // Reset monthly credits
      currentCredits = 0;
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await supabase
        .from('user_limits')
        .update({
          credits_used_this_month: 0,
          credits_reset_at: nextReset.toISOString(),
        })
        .eq('user_id', userId);
    }

    // Check if sufficient credits
    if (currentCredits + requiredCredits > entitlements.monthlyCredits) {
      return {
        allowed: false,
        error: new LimitExceededError(
          `Insufficient credits. This operation requires ${requiredCredits} credits, but you only have ${entitlements.monthlyCredits - currentCredits} remaining for your ${entitlements.planName} plan.`,
          'monthly_credits',
          currentCredits,
          entitlements.monthlyCredits
        ),
      };
    }

    return {
      allowed: true,
      remainingCredits: entitlements.monthlyCredits - currentCredits,
    };
  } catch (error) {
    console.error('Error checking credit limit:', error);
    return {
      allowed: false,
      error: new LimitExceededError('System error checking credits', 'monthly_credits', 0, 0),
    };
  }
}

/**
 * Check if a feature is enabled for user's plan
 */
export async function checkFeatureAccess(
  userId: string,
  feature: 'serpAnalysis' | 'competitorAnalysis' | 'aiInsights' | 'exportData'
): Promise<UsageCheck> {
  try {
    const { data: limitsData, error: limitsError } = await supabase
      .from('user_limits')
      .select('plan_id')
      .eq('user_id', userId)
      .single();

    if (limitsError || !limitsData) {
      return {
        allowed: false,
        error: new FeatureDisabledError('Unable to verify feature access', feature),
      };
    }

    const entitlements = getEntitlements(limitsData.plan_id as PlanId);

    if (!entitlements.features[feature]) {
      return {
        allowed: false,
        error: new FeatureDisabledError(
          `This feature is not available on your ${entitlements.planName} plan. Please upgrade to access ${feature}.`,
          feature
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return {
      allowed: false,
      error: new FeatureDisabledError('System error checking feature access', feature),
    };
  }
}

/**
 * Increment query counter for user
 */
export async function incrementQueryCount(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('increment_query_count', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Failed to increment query count:', error);
    }
  } catch (error) {
    console.error('Error incrementing query count:', error);
  }
}

/**
 * Increment credit usage for user
 */
export async function incrementCreditUsage(userId: string, credits: number): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('increment_credit_usage', {
      p_user_id: userId,
      p_credits: credits,
    });

    if (error) {
      console.error('Failed to increment credit usage:', error);
    }
  } catch (error) {
    console.error('Error incrementing credit usage:', error);
  }
}

/**
 * Convenience function to enforce all limits before an operation
 */
export async function enforceAllLimits(
  userId: string,
  options: {
    checkQuery?: boolean;
    requiredCredits?: number;
    feature?: 'serpAnalysis' | 'competitorAnalysis' | 'aiInsights' | 'exportData';
  }
): Promise<UsageCheck> {
  // Check query limit
  if (options.checkQuery) {
    const queryCheck = await checkQueryLimit(userId);
    if (!queryCheck.allowed) {
      return queryCheck;
    }
  }

  // Check credit limit
  if (options.requiredCredits && options.requiredCredits > 0) {
    const creditCheck = await checkCreditLimit(userId, options.requiredCredits);
    if (!creditCheck.allowed) {
      return creditCheck;
    }
  }

  // Check feature access
  if (options.feature) {
    const featureCheck = await checkFeatureAccess(userId, options.feature);
    if (!featureCheck.allowed) {
      return featureCheck;
    }
  }

  return { allowed: true };
}
