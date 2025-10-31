/**
 * Credit enforcement and usage tracking
 * Integrates with existing user_subscriptions and user_usage tables
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { CreditLimitError } from './dataforseo/types.ts';

export type ActionType = 'keyword' | 'serp' | 'related';

interface UserSubscription {
  tier: string;
  status: string;
  is_trial: boolean;
  trial_ends_at: string | null;
  period_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface CreditCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  tier: string;
  message?: string;
}

export interface UsageIncrementResult {
  success: boolean;
  newUsage: number;
  error?: string;
}

/**
 * Check if user can perform an action based on their subscription limits
 * Uses existing database function: can_user_perform_action
 */
export async function checkCredits(
  supabase: SupabaseClient,
  userId: string,
  actionType: ActionType
): Promise<CreditCheck> {
  try {
    // Call existing database function
    const { data: canPerform, error: canPerformError } = await supabase
      .rpc('can_user_perform_action', {
        user_id_param: userId,
        action_type: actionType,
      });

    if (canPerformError) {
      console.error('[Credits] Error checking user permissions:', canPerformError);
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        tier: 'unknown',
        message: 'Failed to check credit limits',
      };
    }

  // Get detailed usage information
  const { data, error: subError } = await supabase
    .rpc('get_user_subscription', { user_id_param: userId })
    .single();
  
  const subscription = data as UserSubscription | null;

    if (!subscription) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        tier: 'none',
        message: 'No active subscription found',
      };
    }

    // Get current usage
    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('period_end', new Date().toISOString())
      .single();

    // Get plan limits
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', subscription.tier)
      .single();

    if (!plan) {
      return {
        allowed: canPerform || false,
        used: 0,
        limit: 0,
        remaining: 0,
        tier: subscription.tier,
      };
    }

    // Determine limit and usage based on action type
    let limit = 0;
    let used = 0;

    if (actionType === 'keyword') {
      limit = plan.keywords_per_month;
      used = usage?.keywords_used || 0;
    } else if (actionType === 'serp') {
      limit = plan.serp_analyses_per_month;
      used = usage?.serp_analyses_used || 0;
    } else if (actionType === 'related') {
      limit = plan.related_keywords_per_month;
      used = usage?.related_keywords_used || 0;
    }

    // -1 means unlimited
    const isUnlimited = limit === -1;
    const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);

    return {
      allowed: canPerform || false,
      used,
      limit: isUnlimited ? -1 : limit,
      remaining,
      tier: subscription.tier,
    };
  } catch (error) {
    console.error('[Credits] Error checking credits:', error);
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      tier: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enforce credit limits before performing an action
 * Throws CreditLimitError if user has exceeded their limits
 */
export async function enforceCredits(
  supabase: SupabaseClient,
  userId: string,
  actionType: ActionType
): Promise<void> {
  const check = await checkCredits(supabase, userId, actionType);

  if (!check.allowed) {
    const message = check.message ||
      `${actionType} limit reached (${check.used}/${check.limit === -1 ? '∞' : check.limit}). Upgrade your plan to continue.`;

    console.log(JSON.stringify({
      event: 'credit_limit_exceeded',
      user_id: userId,
      action_type: actionType,
      used: check.used,
      limit: check.limit,
      tier: check.tier,
      timestamp: new Date().toISOString(),
    }));

    throw new CreditLimitError(message, userId, actionType, check.used, check.limit);
  }
}

/**
 * Increment usage after successfully performing an action
 * Uses existing database function: increment_usage
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  actionType: ActionType,
  amount: number = 1
): Promise<UsageIncrementResult> {
  try {
    const { error } = await supabase.rpc('increment_usage', {
      user_id_param: userId,
      action_type: actionType,
      amount,
    });

    if (error) {
      console.error('[Credits] Error incrementing usage:', error);
      return {
        success: false,
        newUsage: 0,
        error: error.message,
      };
    }

    // Get updated usage
    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('period_end', new Date().toISOString())
      .single();

    let newUsage = 0;
    if (usage) {
      if (actionType === 'keyword') {
        newUsage = usage.keywords_used;
      } else if (actionType === 'serp') {
        newUsage = usage.serp_analyses_used;
      } else if (actionType === 'related') {
        newUsage = usage.related_keywords_used;
      }
    }

    console.log(JSON.stringify({
      event: 'usage_incremented',
      user_id: userId,
      action_type: actionType,
      amount,
      new_usage: newUsage,
      timestamp: new Date().toISOString(),
    }));

    return {
      success: true,
      newUsage,
    };
  } catch (error) {
    console.error('[Credits] Error incrementing usage:', error);
    return {
      success: false,
      newUsage: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get current usage statistics for a user
 */
export async function getUserUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  keywords: CreditCheck;
  serp: CreditCheck;
  related: CreditCheck;
} | null> {
  try {
    const [keywords, serp, related] = await Promise.all([
      checkCredits(supabase, userId, 'keyword'),
      checkCredits(supabase, userId, 'serp'),
      checkCredits(supabase, userId, 'related'),
    ]);

    return { keywords, serp, related };
  } catch (error) {
    console.error('[Credits] Error getting user usage:', error);
    return null;
  }
}
