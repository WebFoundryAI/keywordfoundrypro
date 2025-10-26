import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, CheckCircle } from 'lucide-react';
import type {
  Cluster,
  ClusteringParams,
  ClusteringResult,
  Keyword,
} from '@/lib/clustering/types';
import { ThresholdControls } from './ThresholdControls';
import { ClusterList } from './ClusterList';
import { ClusterPreview } from './ClusterPreview';
import { mergeClusters, splitCluster } from '@/lib/clustering/clusterer';

interface ClusterWorkbenchProps {
  projectId?: string;
  onCommit: (clusters: Cluster[], params: ClusteringParams) => Promise<void>;
}

export function ClusterWorkbench({ projectId, onCommit }: ClusterWorkbenchProps) {
  const { toast } = useToast();
  const [params, setParams] = useState<ClusteringParams>({
    overlap_threshold: 3,
    distance_threshold: 0.35,
    min_cluster_size: 2,
    semantic_provider: 'none',
  });
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [result, setResult] = useState<ClusteringResult | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | undefined>();
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const selectedCluster = result?.clusters.find(
    (c, i) => (c.id || `preview-${i}`) === selectedClusterId
  );

  const handleCreatePreview = async () => {
    if (keywords.length === 0) {
      toast({
        title: 'No keywords',
        description: 'Please load keywords from a project or upload CSV',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/clustering/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, params }),
      });

      if (!response.ok) {
        throw new Error('Failed to create preview');
      }

      const data = await response.json();
      setResult(data);
      setSelectedForMerge(new Set());
      setSelectedClusterId(undefined);
      toast({
        title: 'Clusters created',
        description: `Generated ${data.clusters.length} clusters`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create clusters',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleMergeSelection = (clusterId: string) => {
    const newSet = new Set(selectedForMerge);
    if (newSet.has(clusterId)) {
      newSet.delete(clusterId);
    } else {
      newSet.add(clusterId);
    }
    setSelectedForMerge(newSet);
  };

  const handleMerge = () => {
    if (!result || selectedForMerge.size < 2) {
      toast({
        title: 'Invalid selection',
        description: 'Select at least 2 clusters to merge',
        variant: 'destructive',
      });
      return;
    }

    const clustersToMerge = result.clusters.filter((c, i) =>
      selectedForMerge.has(c.id || `preview-${i}`)
    );

    const merged = mergeClusters(clustersToMerge, `Merged Cluster (${clustersToMerge.length})`);
    const remaining = result.clusters.filter(
      (c, i) => !selectedForMerge.has(c.id || `preview-${i}`)
    );

    setResult({
      ...result,
      clusters: [...remaining, merged],
    });
    setSelectedForMerge(new Set());
    toast({
      title: 'Clusters merged',
      description: `Merged ${clustersToMerge.length} clusters`,
    });
  };

  const handleSplit = (selectedKeywords: string[]) => {
    if (!result || !selectedCluster) return;

    const [remaining, newCluster] = splitCluster(
      selectedCluster,
      selectedKeywords,
      `Split from ${selectedCluster.name}`
    );

    const clusterIndex = result.clusters.findIndex(
      (c, i) => (c.id || `preview-${i}`) === selectedClusterId
    );

    const updatedClusters = [...result.clusters];
    updatedClusters[clusterIndex] = remaining;
    updatedClusters.push(newCluster);

    setResult({
      ...result,
      clusters: updatedClusters,
    });

    toast({
      title: 'Cluster split',
      description: `Created new cluster with ${selectedKeywords.length} keywords`,
    });
  };

  const handleRename = (clusterId: string) => {
    if (!result) return;
    const cluster = result.clusters.find((c, i) => (c.id || `preview-${i}`) === clusterId);
    if (!cluster) return;

    const newName = prompt('Enter new cluster name:', cluster.name);
    if (newName && newName.trim()) {
      cluster.name = newName.trim();
      setResult({ ...result });
    }
  };

  const handleDelete = (clusterId: string) => {
    if (!result) return;
    const updatedClusters = result.clusters.filter(
      (c, i) => (c.id || `preview-${i}`) !== clusterId
    );
    setResult({
      ...result,
      clusters: updatedClusters,
    });
    toast({
      title: 'Cluster deleted',
      description: 'Cluster removed from preview',
    });
  };

  const handleReset = () => {
    setResult(null);
    setSelectedClusterId(undefined);
    setSelectedForMerge(new Set());
  };

  const handleCommit = async () => {
    if (!result || result.clusters.length === 0) {
      toast({
        title: 'No clusters',
        description: 'Create clusters before committing',
        variant: 'destructive',
      });
      return;
    }

    setIsCommitting(true);
    try {
      await onCommit(result.clusters, params);
      toast({
        title: 'Success',
        description: 'Clusters committed to database',
      });
      handleReset();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to commit clusters',
        variant: 'destructive',
      });
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <ThresholdControls params={params} onChange={setParams} disabled={isProcessing} />
            <div className="mt-6 space-y-2">
              <Button
                onClick={handleCreatePreview}
                disabled={isProcessing || keywords.length === 0}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Create Preview'
                )}
              </Button>
              {result && (
                <>
                  <Button onClick={handleReset} variant="outline" className="w-full">
                    Reset Changes
                  </Button>
                  <Button
                    onClick={handleCommit}
                    disabled={isCommitting}
                    variant="default"
                    className="w-full"
                  >
                    {isCommitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Committing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve & Commit
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Clusters ({result?.clusters.length || 0})
              </CardTitle>
              {selectedForMerge.size >= 2 && (
                <Button size="sm" onClick={handleMerge}>
                  Merge ({selectedForMerge.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ClusterList
              clusters={result?.clusters || []}
              selectedClusterId={selectedClusterId}
              selectedForMerge={selectedForMerge}
              onSelectCluster={setSelectedClusterId}
              onToggleMergeSelection={handleToggleMergeSelection}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        <div>
          <ClusterPreview cluster={selectedCluster || null} onSplit={handleSplit} />
        </div>
      </div>

      {/* Data Source Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Data Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project ID (optional)</Label>
              <Input
                placeholder="Enter project ID to load keywords"
                defaultValue={projectId}
                disabled
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Currently: {keywords.length} keywords loaded
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
