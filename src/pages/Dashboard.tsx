import { Link } from 'react-router-dom';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubscription } from '@/hooks/useSubscription';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Search, TrendingUp, Link2, AlertCircle, Crown } from 'lucide-react';

export default function Dashboard() {
  const { subscription, plan, usage, isLoading, keywordsPercentage, serpPercentage, relatedPercentage } = useSubscription();
  const { isAdmin } = useIsAdmin();

  const isNearLimit = (percentage: number) => percentage >= 80;
  const isOverLimit = (percentage: number) => percentage >= 100;
  
  const anyNearLimit = isNearLimit(keywordsPercentage) || isNearLimit(serpPercentage) || isNearLimit(relatedPercentage);
  const anyOverLimit = isOverLimit(keywordsPercentage) || isOverLimit(serpPercentage) || isOverLimit(relatedPercentage);

  const daysRemaining = subscription?.trial_ends_at 
    ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your usage and manage your subscription
        </p>
      </div>

      {/* Admin Badge */}
      {isAdmin && (
        <Alert className="border-primary bg-primary/5">
          <Crown className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            You have admin access with unlimited usage across all features
          </AlertDescription>
        </Alert>
      )}

      {/* Trial Warning */}
      {!isAdmin && subscription?.is_trial && daysRemaining !== null && daysRemaining <= 3 && (
        <Alert variant={daysRemaining === 0 ? "destructive" : "default"} className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            {daysRemaining === 0 ? (
              <>Your trial has ended. <Link to="/pricing" className="underline font-semibold">Upgrade now</Link> to continue using premium features.</>
            ) : (
              <>Your trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. <Link to="/pricing" className="underline font-semibold">Upgrade now</Link> to keep access.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Warning */}
      {!isAdmin && anyOverLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You've reached your monthly limit for one or more features. <Link to="/pricing" className="underline font-semibold">Upgrade your plan</Link> to continue.
          </AlertDescription>
        </Alert>
      )}

      {!isAdmin && anyNearLimit && !anyOverLimit && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            You're approaching your monthly limit. Consider <Link to="/pricing" className="underline font-semibold">upgrading your plan</Link> to avoid interruptions.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Status */}
        <div className="md:col-span-2">
          <SubscriptionStatus />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start your keyword research</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/research">
              <Button className="w-full justify-start" variant="outline">
                <Search className="mr-2 h-4 w-4" />
                New Keyword Research
              </Button>
            </Link>
            <Link to="/serp-analysis">
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                SERP Analysis
              </Button>
            </Link>
            <Link to="/competitor-analyzer">
              <Button className="w-full justify-start" variant="outline">
                <Link2 className="mr-2 h-4 w-4" />
                Competitor Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/profile">
              <Button className="w-full justify-start" variant="outline">
                Profile Settings
              </Button>
            </Link>
            <Link to="/my-research">
              <Button className="w-full justify-start" variant="outline">
                My Research Projects
              </Button>
            </Link>
            <Link to="/account">
              <Button className="w-full justify-start" variant="outline">
                Privacy & Data
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
