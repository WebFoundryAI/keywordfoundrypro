import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface Subscription {
  tier: 'free_trial' | 'starter' | 'professional' | 'enterprise' | 'admin';
  status: string;
  is_trial: boolean;
  trial_ends_at: string | null;
  period_end: string;
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

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_user_subscription', {
        user_id_param: user.id
      });

      if (error) throw error;
      return data?.[0] as Subscription | null;
    },
    enabled: !!user,
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['subscription-plan', subscription?.tier],
    queryFn: async () => {
      if (!subscription?.tier) return null;

      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('tier', subscription.tier)
        .single();

      if (error) throw error;
      return data as SubscriptionPlan;
    },
    enabled: !!subscription?.tier,
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
    isLoading: subscriptionLoading || planLoading || usageLoading,
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
