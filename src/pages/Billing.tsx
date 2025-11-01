import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getEntitlements, type PlanId, getUsagePercentage } from '@/lib/billing/entitlements';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resolveUserPlan } from '@/lib/billing/plan';

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const [usage, setUsage] = useState({ queries: 0, credits: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    loadBillingInfo();
  }, []);

  useEffect(() => {
    // Show success toast if redirected from successful checkout
    if (searchParams.get('success')) {
      toast({
        title: 'Success!',
        description: 'Your subscription has been activated. Welcome to Pro!',
      });
      // Clean up URL
      searchParams.delete('success');
      setSearchParams(searchParams);
      // Reload billing info
      loadBillingInfo();
    }
    if (searchParams.get('canceled')) {
      toast({
        title: 'Canceled',
        description: 'Checkout was canceled. No charges were made.',
        variant: 'destructive',
      });
      searchParams.delete('canceled');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, toast]);

  const loadBillingInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use plan resolution logic (includes admin override)
      const plan = await resolveUserPlan(user.id, user.user_metadata);
      setCurrentPlan(plan);

      // Load usage stats (simplified)
      setUsage({ queries: 0, credits: 0 });
    } catch (error) {
      console.error('Failed to load billing info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: PlanId) => {
    setUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'Please sign in to upgrade your plan',
          variant: 'destructive',
        });
        return;
      }

      // Call create-checkout-session Edge Function
      const response = await fetch(
        `https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            planTier: planId,
            billingPeriod: 'monthly', // Default to monthly
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    setUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'Please sign in to manage your billing',
          variant: 'destructive',
        });
        return;
      }

      // Call create-portal-session Edge Function
      const response = await fetch(
        `https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create portal session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open billing portal',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(false);
    }
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

          {currentPlan !== 'free' && currentPlan !== 'trial' && (
            <Button onClick={handleManageBilling} variant="outline" disabled={upgrading}>
              {upgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Manage Billing <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
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
                    disabled={upgrading || planId === 'enterprise'}
                  >
                    {upgrading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      planId === 'enterprise' ? 'Contact Sales' : 'Upgrade'
                    )}
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
