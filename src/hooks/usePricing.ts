import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PricingPlan {
  id: string;
  tier: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  keywords_per_month: number;
  serp_analyses_per_month: number;
  related_keywords_per_month: number;
  max_saved_projects: number | null;
  features: string[];
  is_active: boolean;
}

export const usePricing = () => {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .neq('tier', 'admin')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return data as PricingPlan[];
    },
  });

  const calculateYearlySavings = (monthly: number, yearly: number | null) => {
    if (!yearly) return 0;
    const monthlyTotal = monthly * 12;
    const savings = monthlyTotal - yearly;
    const percentage = Math.round((savings / monthlyTotal) * 100);
    return { amount: savings, percentage };
  };

  return {
    plans: plans || [],
    isLoading,
    calculateYearlySavings,
  };
};
