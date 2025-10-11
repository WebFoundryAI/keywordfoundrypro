import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminResearch() {
  const { data: research, isLoading } = useQuery({
    queryKey: ['admin-research'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keyword_research')
        .select(`
          *,
          profiles!inner(display_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Research</h1>
          <p className="text-muted-foreground">View all keyword research sessions</p>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Research</h1>
        <p className="text-muted-foreground">View all keyword research sessions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Research</CardTitle>
          <CardDescription>
            Showing {research?.length ?? 0} most recent sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>API Cost</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {research?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.seed_keyword}</TableCell>
                  <TableCell>
                    {(item.profiles as any)?.display_name || (item.profiles as any)?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.total_results || 0} results
                    </Badge>
                  </TableCell>
                  <TableCell>{item.location_code}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.language_code}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.api_cost ? `$${Number(item.api_cost).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(item.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
