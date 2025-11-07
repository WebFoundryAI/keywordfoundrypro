import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { resolveUserPlan } from '@/lib/billing/plan';
import type { PlanId } from '@/lib/billing/entitlements';

interface Subscription {
  tier: 'free_trial' | 'starter' | 'professional' | 'enterprise' | 'admin';
  status: string;
  is_trial: boolean;
  trial_ends_at: string | null;
  period_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface SubscriptionPlan {
  tier: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  keywords_per_month: number;
  serp_analyses_per_month: number;
  related_keywords_per_month: number;
  max_saved_projects: number;
  features: string[];
}

interface Usage {
  keywords_used: number;
  serp_analyses_used: number;
  related_keywords_used: number;
  period_start: string;
  period_end: string;
}

export const useSubscription = () => {
  const { user } = useAuth();

  // Helper to map PlanId to database tier
  const mapPlanIdToDbTier = (planId: PlanId): string => {
    const mapping: Record<PlanId, string> = {
      'free': 'free_trial',
      'trial': 'free_trial', 
      'pro': 'professional',
      'enterprise': 'enterprise'
    };
    return mapping[planId] || planId;
  };

  // First, get the effective tier (with admin override)
  const { data: effectiveTier, isLoading: tierLoading } = useQuery({
    queryKey: ['effective-tier', user?.id],
    queryFn: async () => {
      if (!user) return null;
      // resolveUserPlan checks admin status and returns 'pro' for admins
      const tier = await resolveUserPlan(user.id, user.user_metadata);
      return tier;
    },
    enabled: !!user,
  });

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription', user?.id, effectiveTier],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_user_subscription', {
        user_id_param: user.id
      });

      if (error) throw error;
      const sub = data?.[0] as Subscription | null;
      
      // Override the tier with mapped effectiveTier if available (for admin users)
      if (sub && effectiveTier) {
        const dbTier = mapPlanIdToDbTier(effectiveTier);
        return { ...sub, tier: dbTier as any };
      }
      
      return sub;
    },
    enabled: !!user && effectiveTier !== undefined,
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['subscription-plan', effectiveTier],
    queryFn: async () => {
      if (!effectiveTier) return null;

      // Map internal PlanId to database tier
      const dbTier = mapPlanIdToDbTier(effectiveTier) as 'free_trial' | 'starter' | 'professional' | 'enterprise' | 'admin';

      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('tier', dbTier)
        .single();

      if (error) throw error;
      return data as SubscriptionPlan;
    },
    enabled: !!effectiveTier,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .lte('period_start', new Date().toISOString())
        .gte('period_end', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      return data as Usage | null;
    },
    enabled: !!user,
  });

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  return {
    subscription,
    plan,
    usage,
    isLoading: tierLoading || subscriptionLoading || planLoading || usageLoading,
    keywordsPercentage: plan && usage 
      ? getUsagePercentage(usage.keywords_used || 0, plan.keywords_per_month)
      : 0,
    serpPercentage: plan && usage
      ? getUsagePercentage(usage.serp_analyses_used || 0, plan.serp_analyses_per_month)
      : 0,
    relatedPercentage: plan && usage
      ? getUsagePercentage(usage.related_keywords_used || 0, plan.related_keywords_per_month)
      : 0,
  };
};
