import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { UsageProgressBar } from '@/components/UsageProgressBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from '@/hooks/useSubscription';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Search, TrendingUp, Link2, AlertCircle, Crown, ArrowUpRight, Plus } from 'lucide-react';
import { useState, useMemo } from "react";
import { ResearchRow } from "@/types/research";
import { BulkDeleteToolbar } from "@/components/my-research/BulkDeleteToolbar";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const { subscription, plan, usage, isLoading, keywordsPercentage, serpPercentage, relatedPercentage } = useSubscription();
  const { isAdmin } = useIsAdmin();

  const { data: research, isLoading: isResearchLoading } = useQuery({
    queryKey: ['my-research', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('keyword_research')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const rowIds = useMemo(() => research?.map((r) => r.id) ?? [], [research]);
  const selectedIds = useMemo(() => rowIds.filter((id) => selected[id]), [rowIds, selected]);
  const allOnPageSelected = rowIds.length > 0 && selectedIds.length === rowIds.length;

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((s) => ({ ...s, [id]: checked }));
  };

  const toggleAll = (checked: boolean) => {
    setSelected((s) => {
      const next = { ...s };
      for (const id of rowIds) next[id] = checked;
      return next;
    });
  };

  const handleAfterDelete = (deletedIds: string[]) => {
    queryClient.setQueryData<ResearchRow[]>(['my-research', user?.id], (old) =>
      old?.filter((item) => !deletedIds.includes(item.id))
    );
  };

  const handleRowClick = (researchId: string, seedKeyword: string, querySource: string | null, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
      return;
    }
    localStorage.setItem('currentResearchId', researchId);
    localStorage.setItem('keywordAnalyzed', seedKeyword);
    
    if (querySource === 'serps') {
      navigate(`/serp-analysis?keyword=${encodeURIComponent(seedKeyword)}`);
    } else if (querySource === 'related keyword') {
      navigate(`/related-keywords?keyword=${encodeURIComponent(seedKeyword)}`);
    } else {
      navigate(`/keyword-results?id=${researchId}`);
    }
  };

  const handleNewResearch = () => {
    navigate('/research');
  };

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

      {/* Research History Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Research History</CardTitle>
              <CardDescription>
                {isResearchLoading ? "Loading..." : research?.length === 0
                  ? "No research sessions yet. Start your first keyword research!"
                  : `Showing ${research?.length ?? 0} research sessions`
                }
              </CardDescription>
            </div>
            <Button onClick={handleNewResearch}>
              <Plus className="mr-2 h-4 w-4" />
              New Research
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isResearchLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : research?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't performed any keyword research yet.</p>
              <Button onClick={handleNewResearch}>
                <Plus className="mr-2 h-4 w-4" />
                Start Your First Research
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(v) => toggleAll(Boolean(v))}
                      aria-label="Select all on page"
                    />
                  </TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Query</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {research?.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={(e) => handleRowClick(item.id, item.seed_keyword, (item as any).query_source, e)}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={Boolean(selected[item.id])}
                        onCheckedChange={(v) => toggleRow(item.id, Boolean(v))}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.seed_keyword}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(item as any).query_source || ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.total_results || 0} results
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.location_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.language_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BulkDeleteToolbar
        selectedIds={selectedIds}
        onClear={() => setSelected({})}
        onAfterDelete={handleAfterDelete}
      />

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
        {/* Enhanced Usage Overview with Color-Coded Progress Bars */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle>{plan?.name || 'Free Trial Plan'}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                        {subscription?.status || 'active'}
                      </Badge>
                      {subscription?.is_trial && daysRemaining !== null && (
                        <span className="text-sm text-muted-foreground">
                          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in trial
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!isAdmin && plan && (
                  <Link to="/pricing">
                    <Button size="sm" variant="outline">
                      Upgrade Plan <ArrowUpRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? (
                <div className="text-center py-8 space-y-2">
                  <Crown className="w-12 h-12 mx-auto text-primary" />
                  <p className="text-lg font-semibold">Unlimited Access</p>
                  <p className="text-sm text-muted-foreground">
                    You have admin privileges with unlimited usage across all features
                  </p>
                </div>
              ) : plan && usage ? (
                <>
                  <UsageProgressBar
                    label="Keyword Searches"
                    used={usage.keywords_used || 0}
                    limit={plan.keywords_per_month}
                    percentage={keywordsPercentage}
                  />
                  <UsageProgressBar
                    label="SERP Analyses"
                    used={usage.serp_analyses_used || 0}
                    limit={plan.serp_analyses_per_month}
                    percentage={serpPercentage}
                  />
                  <UsageProgressBar
                    label="Related Keywords"
                    used={usage.related_keywords_used || 0}
                    limit={plan.related_keywords_per_month}
                    percentage={relatedPercentage}
                  />
                  
                  {subscription && (
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current Plan</span>
                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                          {plan.name}
                        </Badge>
                      </div>
                      {subscription.period_end && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Billing period ends</span>
                          <span className="font-medium">
                            {new Date(subscription.period_end).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading usage data...</p>
                </div>
              )}
            </CardContent>
          </Card>
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
