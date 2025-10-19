import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface KeywordCluster {
  id: string;
  research_id: string;
  cluster_id: string;
  status: 'unreviewed' | 'approved' | 'rejected';
  keyword_count: number;
  reviewed_at: string | null;
  created_at: string;
  keyword_research: {
    seed_keyword: string;
    profiles: {
      display_name: string | null;
      email: string | null;
    } | null;
  } | null;
}

type ActionType = 'approve' | 'reject' | null;

const Clustering = () => {
  const [selectedCluster, setSelectedCluster] = useState<KeywordCluster | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ['keyword-clusters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keyword_clusters')
        .select(`
          *,
          keyword_research (
            seed_keyword,
            profiles (
              display_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KeywordCluster[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('keyword_clusters')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-clusters'] });
      toast({
        title: "Status Updated",
        description: `Cluster ${actionType === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });
      setSelectedCluster(null);
      setActionType(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAction = (cluster: KeywordCluster, action: 'approve' | 'reject') => {
    setSelectedCluster(cluster);
    setActionType(action);
  };

  const confirmAction = () => {
    if (selectedCluster && actionType) {
      updateStatusMutation.mutate({
        id: selectedCluster.id,
        status: actionType === 'approve' ? 'approved' : 'rejected',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      unreviewed: { variant: "outline", label: "Unreviewed" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || variants.unreviewed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading keyword clusters...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Keyword Clustering Queue</h1>
        <p className="text-muted-foreground mt-1">
          Review and manage keyword cluster assignments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unreviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clusters.filter(c => c.status === 'unreviewed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {clusters.filter(c => c.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {clusters.filter(c => c.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clusters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Keyword Clusters</CardTitle>
          <CardDescription>
            Review and approve keyword clustering assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No keyword clusters found.</p>
              <p className="text-sm mt-2">Clusters will appear here as they are created.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cluster ID</TableHead>
                  <TableHead>Research Seed</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Keywords</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.map((cluster) => (
                  <TableRow key={cluster.id}>
                    <TableCell className="font-mono text-sm">
                      {cluster.cluster_id}
                    </TableCell>
                    <TableCell>
                      {cluster.keyword_research?.seed_keyword || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {cluster.keyword_research?.profiles?.display_name || 
                       cluster.keyword_research?.profiles?.email || 
                       'Unknown'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {cluster.keyword_count}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cluster.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(cluster.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(cluster, 'approve')}
                          disabled={cluster.status === 'approved' || updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(cluster, 'reject')}
                          disabled={cluster.status === 'rejected' || updateStatusMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedCluster && !!actionType} onOpenChange={() => {
        setSelectedCluster(null);
        setActionType(null);
      }}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Cluster?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType} cluster <strong>{selectedCluster?.cluster_id}</strong>?
              This will update the cluster status to {actionType === 'approve' ? 'approved' : 'rejected'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clustering;
