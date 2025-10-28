import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function MyResearch() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleRowClick = (researchId: string, seedKeyword: string) => {
    localStorage.setItem('currentResearchId', researchId);
    localStorage.setItem('keywordAnalyzed', seedKeyword);
    navigate('/keyword-results');
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
                  <TableHead>Keyword</TableHead>
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
                    onClick={() => handleRowClick(item.id, item.seed_keyword)}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <TableCell className="font-medium">{item.seed_keyword}</TableCell>
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
    </div>
  );
}
