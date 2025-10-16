import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePricing } from '@/hooks/usePricing';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/components/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/supabaseHelpers';
import { toast } from 'sonner';
import { storePlanSelection } from '@/lib/planStorage';

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { plans, isLoading, calculateYearlySavings } = usePricing();
  const { subscription } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Detect if this is a new user signup flow
  const searchParams = new URLSearchParams(window.location.search);
  const isNewUser = searchParams.get('new') === 'true';

  const formatNumber = (num: number) => {
    if (num === -1) return 'Unlimited';
    return num.toLocaleString();
  };

  const handleGetStarted = async (planTier: string, planId: string) => {
    // Store plan selection in localStorage before any auth flow
    storePlanSelection({ 
      tier: planTier, 
      planId, 
      billing: isYearly ? 'yearly' : 'monthly' 
    });

    if (isNewUser && user) {
      // New user selecting initial plan - go to research
      // Subscription already created by trigger with default free_trial
      navigate('/research');
    } else if (user) {
      // Existing user wants to upgrade
      if (planTier === 'free_trial') {
        // Downgrade to free trial (shouldn't happen but handle it)
        navigate('/research');
      } else {
        // Paid plan - create Stripe checkout session
        try {
          toast.info('Redirecting to checkout...');
          const data = await invokeWithAuth('create-checkout-session', {
            planTier, 
            billingPeriod: isYearly ? 'yearly' : 'monthly' 
          });
          
          if (data?.url) {
            window.location.href = data.url;
          } else {
            throw new Error('No checkout URL returned');
          }
        } catch (error: any) {
          console.error('Error creating checkout session:', error);
          toast.error(error.message || 'Failed to start checkout. Please try again.');
        }
      }
    } else {
      // Not logged in - go to signup with plan params
      navigate(`/auth/sign-up?plan=${planTier}&planId=${planId}&billing=${isYearly ? 'yearly' : 'monthly'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="mb-8">
            <Skeleton className="h-10 w-48 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[600px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Start with a 7-day free trial. No credit card required.
          </p>
          
          {isNewUser && (
            <div className="mx-auto max-w-2xl mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-primary font-medium">
                🎉 Welcome! Choose your plan to get started (you can change it anytime)
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 mb-8">
            <Label htmlFor="billing-toggle" className={!isYearly ? 'font-semibold' : ''}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label htmlFor="billing-toggle" className={isYearly ? 'font-semibold' : ''}>
              Yearly
              <Badge variant="secondary" className="ml-2">Save up to 20%</Badge>
            </Label>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.tier === plan.tier;
            const savings = plan.price_yearly ? calculateYearlySavings(plan.price_monthly, plan.price_yearly) : null;
            const price = isYearly && plan.price_yearly ? plan.price_yearly : plan.price_monthly;
            const displayPrice = isYearly && plan.price_yearly 
              ? Math.round(plan.price_yearly / 12) 
              : price;

            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.tier === 'professional' ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.tier === 'professional' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-3xl font-bold mt-2">
                    {displayPrice === 0 ? (
                      'Free'
                    ) : (
                      <>
                        ${displayPrice}
                        <span className="text-base font-normal text-muted-foreground">/month</span>
                      </>
                    )}
                  </CardDescription>
                  {isYearly && plan.price_yearly && savings && savings.percentage > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Save ${savings.amount}/year ({savings.percentage}% off)
                    </p>
                  )}
                  {plan.tier === 'free_trial' && (
                    <Badge variant="outline" className="w-fit">7-day free trial</Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Keyword Searches</span>
                      <span className="font-semibold">{formatNumber(plan.keywords_per_month)}/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SERP Analyses</span>
                      <span className="font-semibold">{formatNumber(plan.serp_analyses_per_month)}/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Related Keywords</span>
                      <span className="font-semibold">{formatNumber(plan.related_keywords_per_month)}/mo</span>
                    </div>
                    {plan.max_saved_projects !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Saved Projects</span>
                        <span className="font-semibold">{formatNumber(plan.max_saved_projects)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter>
                  {isCurrentPlan ? (
                    <Button disabled className="w-full">Current Plan</Button>
                  ) : plan.tier === 'free_trial' ? (
                    <Button onClick={() => handleGetStarted(plan.tier, plan.id)} className="w-full">
                      Start Free Trial
                    </Button>
                  ) : (
                    <Button onClick={() => handleGetStarted(plan.tier, plan.id)} variant="outline" className="w-full">
                      Get Started
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>All plans include email support and regular feature updates.</p>
          <p className="mt-2">Need a custom plan? <Link to="/contact" className="text-primary hover:underline">Contact us</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
