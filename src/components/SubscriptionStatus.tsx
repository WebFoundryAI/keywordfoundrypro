import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const SubscriptionStatus = () => {
  const { subscription, plan, usage, isLoading, keywordsPercentage, serpPercentage, relatedPercentage } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription || !plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>No active subscription found</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/pricing">
            <Button>View Pricing Plans</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num === -1) return 'Unlimited';
    return num.toLocaleString();
  };

  const isNearLimit = (percentage: number) => percentage >= 80;
  const isOverLimit = (percentage: number) => percentage >= 100;

  const daysRemaining = subscription.trial_ends_at 
    ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{plan.name} Plan</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
              {subscription.is_trial && daysRemaining !== null && (
                <Badge variant="outline">
                  {daysRemaining} days left in trial
                </Badge>
              )}
            </CardDescription>
          </div>
          {subscription.tier !== 'enterprise' && subscription.tier !== 'admin' && (
            <Link to="/pricing">
              <Button size="sm" variant="outline">
                Upgrade <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {subscription.is_trial && daysRemaining !== null && daysRemaining <= 3 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
              <Link to="/pricing" className="ml-1 underline">Upgrade now</Link> to continue using the service.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Keyword Searches</span>
              <span className={isOverLimit(keywordsPercentage) ? 'text-destructive font-semibold' : ''}>
                {usage?.keywords_used || 0} / {formatNumber(plan.keywords_per_month)}
              </span>
            </div>
            <Progress 
              value={keywordsPercentage} 
              className={isNearLimit(keywordsPercentage) ? '[&>div]:bg-destructive' : ''}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">SERP Analyses</span>
              <span className={isOverLimit(serpPercentage) ? 'text-destructive font-semibold' : ''}>
                {usage?.serp_analyses_used || 0} / {formatNumber(plan.serp_analyses_per_month)}
              </span>
            </div>
            <Progress 
              value={serpPercentage}
              className={isNearLimit(serpPercentage) ? '[&>div]:bg-destructive' : ''}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Related Keywords</span>
              <span className={isOverLimit(relatedPercentage) ? 'text-destructive font-semibold' : ''}>
                {usage?.related_keywords_used || 0} / {formatNumber(plan.related_keywords_per_month)}
              </span>
            </div>
            <Progress 
              value={relatedPercentage}
              className={isNearLimit(relatedPercentage) ? '[&>div]:bg-destructive' : ''}
            />
          </div>
        </div>

        {(isOverLimit(keywordsPercentage) || isOverLimit(serpPercentage) || isOverLimit(relatedPercentage)) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached your monthly limit. 
              <Link to="/pricing" className="ml-1 underline">Upgrade your plan</Link> to continue.
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t text-xs text-muted-foreground">
          Period ends: {new Date(subscription.period_end).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
