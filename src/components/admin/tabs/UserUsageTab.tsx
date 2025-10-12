import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Search, Link, TrendingUp } from "lucide-react";

interface UserUsageTabProps {
  userId: string;
}

export function UserUsageTab({ userId }: UserUsageTabProps) {
  const { data: apiCost, isLoading: costLoading } = useQuery({
    queryKey: ['user-api-cost', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keyword_research')
        .select('api_cost')
        .eq('user_id', userId);

      if (error) throw error;
      
      const total = data?.reduce((sum, record) => sum + (Number(record.api_cost) || 0), 0) || 0;
      return total.toFixed(2);
    },
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['user-usage', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['user-plan', userId],
    queryFn: async () => {
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', userId)
        .maybeSingle();

      if (subError) throw subError;
      if (!subscription) return null;

      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('tier', subscription.tier)
        .single();

      if (planError) throw planError;
      return planData;
    },
  });

  if (costLoading || usageLoading || planLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            DataForSEO API Credits
          </CardTitle>
          <CardDescription>Total credits spent on keyword research</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">${apiCost || '0.00'}</div>
        </CardContent>
      </Card>

      {usage && plan ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Keyword Research
              </CardTitle>
              <CardDescription>
                {usage.keywords_used || 0} / {plan.keywords_per_month === -1 ? '∞' : plan.keywords_per_month} keywords
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress 
                value={calculatePercentage(usage.keywords_used || 0, plan.keywords_per_month)} 
                className="h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                SERP Analysis
              </CardTitle>
              <CardDescription>
                {usage.serp_analyses_used || 0} / {plan.serp_analyses_per_month === -1 ? '∞' : plan.serp_analyses_per_month} analyses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress 
                value={calculatePercentage(usage.serp_analyses_used || 0, plan.serp_analyses_per_month)} 
                className="h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Related Keywords
              </CardTitle>
              <CardDescription>
                {usage.related_keywords_used || 0} / {plan.related_keywords_per_month === -1 ? '∞' : plan.related_keywords_per_month} searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress 
                value={calculatePercentage(usage.related_keywords_used || 0, plan.related_keywords_per_month)} 
                className="h-2"
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">No usage data available for current period</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
