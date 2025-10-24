import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, TrendingUp, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersResult, researchResult, resultsResult, cacheResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('keyword_research').select('id', { count: 'exact', head: true }),
        supabase.from('keyword_results').select('id', { count: 'exact', head: true }),
        supabase.from('competitor_cache').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalUsers: usersResult.count ?? 0,
        totalResearch: researchResult.count ?? 0,
        totalResults: resultsResult.count ?? 0,
        cacheEntries: cacheResult.count ?? 0,
      };
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('competitor_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Competitor cache cleared successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to clear cache: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">System overview and statistics</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      description: "Registered users",
      icon: Users,
    },
    {
      title: "Keyword Research",
      value: stats?.totalResearch ?? 0,
      description: "Total research sessions",
      icon: Search,
    },
    {
      title: "Keyword Results",
      value: stats?.totalResults ?? 0,
      description: "Total keywords analyzed",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">System overview and statistics</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => clearCacheMutation.mutate()}
          disabled={clearCacheMutation.isPending || (stats?.cacheEntries ?? 0) === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Cache ({stats?.cacheEntries ?? 0})
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Competitor analysis cache stores results for 24 hours. Current cache version: v2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cached entries:</span>
            <span className="font-semibold">{stats?.cacheEntries ?? 0}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Clear cache to force fresh data fetches. Old cache entries (v1) are automatically ignored.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
