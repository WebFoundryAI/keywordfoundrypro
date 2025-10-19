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
import { CheckCircle, XCircle, Eye } from "lucide-react";

interface KeywordCluster {
  id: string;
  research_id: string;
  cluster_id: string;
  status: 'unreviewed' | 'approved' | 'rejected';
  keyword_count: number;
  created_at: string;
  keyword_research: {
    seed_keyword: string;
  };
}

type ActionType = 'approve' | 'reject' | null;

const Clustering = () => {
  const [selectedCluster, setSelectedCluster] = useState<KeywordCluster | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clusters, isLoading } = useQuery({
    queryKey: ['keyword-clusters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keyword_clusters')
        .select(`
          *,
          keyword_research(seed_keyword)
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
        title: "Success",
        description: `Cluster ${actionType === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });
      setSelectedCluster(null);
      setActionType(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update cluster: ${error.message}`,
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
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      unreviewed: { variant: "outline", label: "Unreviewed" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || variants.unreviewed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filterByStatus = (status: 'unreviewed' | 'approved' | 'rejected' | 'all') => {
    if (status === 'all') return clusters || [];
    return clusters?.filter(c => c.status === status) || [];
  };

  const stats = {
    total: clusters?.length || 0,
    unreviewed: clusters?.filter(c => c.status === 'unreviewed').length || 0,
    approved: clusters?.filter(c => c.status === 'approved').length || 0,
    rejected: clusters?.filter(c => c.status === 'rejected').length || 0,
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading clusters...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Keyword Cluster Review</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve keyword clustering results
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Clusters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unreviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.unreviewed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Clusters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cluster Queue</CardTitle>
          <CardDescription>
            Review keyword clusters and update their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!clusters || clusters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No keyword clusters found.</p>
              <p className="text-sm mt-2">Clusters will appear here as they are created.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seed Keyword</TableHead>
                  <TableHead>Cluster ID</TableHead>
                  <TableHead className="text-right">Keywords</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.map((cluster) => (
                  <TableRow key={cluster.id}>
                    <TableCell className="font-medium">
                      {cluster.keyword_research.seed_keyword}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {cluster.cluster_id}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">{cluster.keyword_count}</TableCell>
                    <TableCell>{getStatusBadge(cluster.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(cluster.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {cluster.status === 'unreviewed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(cluster, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(cluster, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {cluster.status !== 'unreviewed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              toast({
                                title: "Cluster Details",
                                description: `Cluster ${cluster.cluster_id} was reviewed`,
                              });
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        )}
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
      <AlertDialog open={!!selectedCluster && !!actionType} onOpenChange={(open) => {
        if (!open) {
          setSelectedCluster(null);
          setActionType(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve Cluster' : 'Reject Cluster'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType} cluster{' '}
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {selectedCluster?.cluster_id}
              </code>
              {' '}from "{selectedCluster?.keyword_research.seed_keyword}"?
              <br />
              <br />
              This will update the cluster status to{' '}
              <strong>{actionType === 'approve' ? 'approved' : 'rejected'}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionType === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clustering;
