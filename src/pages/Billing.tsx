import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getEntitlements, type PlanId, getUsagePercentage } from '@/lib/billing/entitlements';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const [usage, setUsage] = useState({ queries: 0, credits: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user limits
      const { data: limits } = await supabase
        .from('user_limits')
        .select('plan_id')
        .eq('user_id', user.id)
        .single();

      if (limits) {
        setCurrentPlan(limits.plan_id as PlanId);
      }

      // Load usage stats (simplified)
      setUsage({ queries: 0, credits: 0 });
    } catch (error) {
      console.error('Failed to load billing info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: PlanId) => {
    toast({
      title: 'Upgrade',
      description: 'Stripe checkout integration coming soon',
    });
  };

  const handleManageBilling = () => {
    toast({
      title: 'Customer Portal',
      description: 'Stripe customer portal integration coming soon',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const entitlements = getEntitlements(currentPlan);
  const plans: PlanId[] = ['free', 'trial', 'pro', 'enterprise'];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan: {entitlements.planName}</CardTitle>
          <CardDescription>Your active subscription tier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Queries Per Day</p>
              <p className="text-2xl font-bold">
                {entitlements.queriesPerDay === -1 ? 'Unlimited' : entitlements.queriesPerDay}
              </p>
              {entitlements.queriesPerDay > 0 && (
                <p className="text-sm text-muted-foreground">
                  {usage.queries} used ({getUsagePercentage(usage.queries, entitlements.queriesPerDay)}%)
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Credits</p>
              <p className="text-2xl font-bold">
                {entitlements.monthlyCredits === -1 ? 'Unlimited' : entitlements.monthlyCredits}
              </p>
              {entitlements.monthlyCredits > 0 && (
                <p className="text-sm text-muted-foreground">
                  {usage.credits} used ({getUsagePercentage(usage.credits, entitlements.monthlyCredits)}%)
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Export Rows</p>
              <p className="text-2xl font-bold">
                {entitlements.maxRowsPerExport === -1 ? 'Unlimited' : entitlements.maxRowsPerExport.toLocaleString()}
              </p>
            </div>
          </div>

          {currentPlan !== 'free' && (
            <Button onClick={handleManageBilling} variant="outline">
              Manage Billing <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((planId) => {
          const plan = getEntitlements(planId);
          const isCurrent = planId === currentPlan;

          return (
            <Card key={planId} className={isCurrent ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.planName}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <CardDescription>
                  {planId === 'free' && 'Get started for free'}
                  {planId === 'trial' && 'Try all features'}
                  {planId === 'pro' && 'For professionals'}
                  {planId === 'enterprise' && 'Custom solution'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-1 text-primary" />
                    <span className="text-sm">
                      {plan.queriesPerDay === -1 ? 'Unlimited' : plan.queriesPerDay} queries/day
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-1 text-primary" />
                    <span className="text-sm">
                      {plan.monthlyCredits === -1 ? 'Unlimited' : plan.monthlyCredits} credits/month
                    </span>
                  </div>
                  {plan.features.serpAnalysis && (
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-1 text-primary" />
                      <span className="text-sm">SERP Analysis</span>
                    </div>
                  )}
                  {plan.features.competitorAnalysis && (
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-1 text-primary" />
                      <span className="text-sm">Competitor Analysis</span>
                    </div>
                  )}
                  {plan.features.aiInsights && (
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-1 text-primary" />
                      <span className="text-sm">AI Insights</span>
                    </div>
                  )}
                </div>

                {!isCurrent && (
                  <Button
                    onClick={() => handleUpgrade(planId)}
                    className="w-full"
                    variant={planId === 'pro' ? 'default' : 'outline'}
                  >
                    {planId === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
