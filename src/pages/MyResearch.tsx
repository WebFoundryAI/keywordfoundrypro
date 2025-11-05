import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { ResearchRow } from "@/types/research";
import { BulkDeleteToolbar } from "@/components/my-research/BulkDeleteToolbar";

export default function MyResearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const { data: research, isLoading } = useQuery({
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
    // Optimistically update the cache
    queryClient.setQueryData<ResearchRow[]>(['my-research', user?.id], (old) =>
      old?.filter((item) => !deletedIds.includes(item.id))
    );
  };

  const handleRowClick = (researchId: string, seedKeyword: string, querySource: string | null, e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox
    if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
      return;
    }
    localStorage.setItem('currentResearchId', researchId);
    localStorage.setItem('keywordAnalyzed', seedKeyword);
    
    // Route based on query source
    if (querySource === 'serps') {
      navigate(`/serp-analysis?keyword=${encodeURIComponent(seedKeyword)}`);
    } else if (querySource === 'related keyword') {
      navigate(`/related-keywords?keyword=${encodeURIComponent(seedKeyword)}`);
    } else {
      // Default to keyword results for "keyword results" or blank
      navigate(`/keyword-results?id=${researchId}`);
    }
  };

  const handleNewResearch = () => {
    navigate('/research');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Research</h1>
            <p className="text-muted-foreground">View your keyword research history</p>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Research</h1>
          <p className="text-muted-foreground">View your keyword research history</p>
        </div>
        <Button onClick={handleNewResearch}>
          <Plus className="mr-2 h-4 w-4" />
          New Research
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Research History</CardTitle>
          <CardDescription>
            {research?.length === 0
              ? "No research sessions yet. Start your first keyword research!"
              : `Showing ${research?.length ?? 0} research sessions`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {research?.length === 0 ? (
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
    </div>
  );
}
