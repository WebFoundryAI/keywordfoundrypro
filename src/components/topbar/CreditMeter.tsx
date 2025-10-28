/**
 * Credit Meter - Displays user's API usage vs. subscription limits
 * Shows warning at >=80%, hard stop at >=100%
 */

import { FC, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, TrendingUp, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageStats {
  keywords: {
    used: number;
    limit: number;
    percentage: number;
  };
  serp: {
    used: number;
    limit: number;
    percentage: number;
  };
  related: {
    used: number;
    limit: number;
    percentage: number;
  };
  tier: string;
  periodEnd: string;
}

export const CreditMeter: FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);

      // Get subscription info
      const { data: subscription, error: subError } = await supabase
        .rpc('get_user_subscription', { user_id_param: user.id })
        .single();

      if (subError) throw subError;

      if (!subscription) {
        setError('No active subscription');
        setLoading(false);
        return;
      }

      // Get plan limits
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('tier', subscription.tier)
        .single();

      if (planError) throw planError;

      // Get current period usage
      const { data: currentUsage, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .gte('period_end', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        // PGRST116 = no rows, which is ok
        throw usageError;
      }

      // Calculate percentages
      const keywordsUsed = currentUsage?.keywords_used || 0;
      const serpUsed = currentUsage?.serp_analyses_used || 0;
      const relatedUsed = currentUsage?.related_keywords_used || 0;

      const keywordsLimit = plan.keywords_per_month;
      const serpLimit = plan.serp_analyses_per_month;
      const relatedLimit = plan.related_keywords_per_month;

      setUsage({
        keywords: {
          used: keywordsUsed,
          limit: keywordsLimit,
          percentage: keywordsLimit === -1 ? 0 : (keywordsUsed / keywordsLimit) * 100,
        },
        serp: {
          used: serpUsed,
          limit: serpLimit,
          percentage: serpLimit === -1 ? 0 : (serpUsed / serpLimit) * 100,
        },
        related: {
          used: relatedUsed,
          limit: relatedLimit,
          percentage: relatedLimit === -1 ? 0 : (relatedUsed / relatedLimit) * 100,
        },
        tier: subscription.tier,
        periodEnd: subscription.period_end,
      });

      setLoading(false);
    } catch (err) {
      console.error('[CreditMeter] Error loading usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadUsage();

    // Refresh every 30 seconds
    const interval = setInterval(loadUsage, 30000);
    return () => clearInterval(interval);
  }, [user, loadUsage]);

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 80) return 'bg-yellow-500';
    return '';
  };

  const formatLimit = (limit: number): string => {
    return limit === -1 ? '∞' : limit.toLocaleString();
  };

  const isOverLimit = usage && (
    (usage.keywords.limit !== -1 && usage.keywords.percentage >= 100) ||
    (usage.serp.limit !== -1 && usage.serp.percentage >= 100) ||
    (usage.related.limit !== -1 && usage.related.percentage >= 100)
  );

  const isNearLimit = usage && !isOverLimit && (
    (usage.keywords.limit !== -1 && usage.keywords.percentage >= 80) ||
    (usage.serp.limit !== -1 && usage.serp.percentage >= 80) ||
    (usage.related.limit !== -1 && usage.related.percentage >= 80)
  );

  if (loading || !usage) {
    return null;
  }

  if (error) {
    return (
      <div className={cn('px-4 py-2', className)}>
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Usage unavailable
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn('px-4 py-2', className)}>
      <TooltipProvider>
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-3 gap-2">
                  {isOverLimit && <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />}
                  {isNearLimit && !isOverLimit && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {usage.tier === 'admin' || usage.keywords.limit === -1
                      ? 'Unlimited'
                      : `${usage.keywords.used.toLocaleString()} / ${formatLimit(usage.keywords.limit)}`}
                  </span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click for detailed usage</p>
            </TooltipContent>
          </Tooltip>

          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">API Usage</h4>
                  <Badge variant="outline" className="text-xs">
                    {usage.tier}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Period ends: {new Date(usage.periodEnd).toLocaleDateString()}
                </p>
              </div>

              <Separator />

              {/* Keywords Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Keyword Searches</span>
                  <span className={cn('text-xs', getStatusColor(usage.keywords.percentage))}>
                    {usage.keywords.used.toLocaleString()} / {formatLimit(usage.keywords.limit)}
                  </span>
                </div>
                {usage.keywords.limit !== -1 && (
                  <>
                    <Progress
                      value={Math.min(usage.keywords.percentage, 100)}
                      className="h-2"
                      indicatorClassName={getProgressColor(usage.keywords.percentage)}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.round(usage.keywords.percentage)}% used</span>
                      <span>
                        {Math.max(0, usage.keywords.limit - usage.keywords.used).toLocaleString()} remaining
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* SERP Analysis Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">SERP Analyses</span>
                  <span className={cn('text-xs', getStatusColor(usage.serp.percentage))}>
                    {usage.serp.used.toLocaleString()} / {formatLimit(usage.serp.limit)}
                  </span>
                </div>
                {usage.serp.limit !== -1 && (
                  <>
                    <Progress
                      value={Math.min(usage.serp.percentage, 100)}
                      className="h-2"
                      indicatorClassName={getProgressColor(usage.serp.percentage)}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.round(usage.serp.percentage)}% used</span>
                      <span>
                        {Math.max(0, usage.serp.limit - usage.serp.used).toLocaleString()} remaining
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Related Keywords Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Related Keywords</span>
                  <span className={cn('text-xs', getStatusColor(usage.related.percentage))}>
                    {usage.related.used.toLocaleString()} / {formatLimit(usage.related.limit)}
                  </span>
                </div>
                {usage.related.limit !== -1 && (
                  <>
                    <Progress
                      value={Math.min(usage.related.percentage, 100)}
                      className="h-2"
                      indicatorClassName={getProgressColor(usage.related.percentage)}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.round(usage.related.percentage)}% used</span>
                      <span>
                        {Math.max(0, usage.related.limit - usage.related.used).toLocaleString()} remaining
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Warnings & CTAs */}
              {isOverLimit && (
                <>
                  <Separator />
                  <Alert variant="destructive" className="py-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      You've reached your monthly limit. Upgrade to continue using the service.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="w-full"
                    size="sm"
                  >
                    Upgrade Plan
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </>
              )}

              {isNearLimit && !isOverLimit && (
                <>
                  <Separator />
                  <Alert className="py-3 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                      You're approaching your monthly limit. Consider upgrading.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() => navigate('/pricing')}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    View Plans
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    </div>
  );
};
