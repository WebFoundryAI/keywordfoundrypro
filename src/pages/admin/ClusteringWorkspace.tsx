import { ClusterWorkbench } from '@/components/admin/clustering/ClusterWorkbench';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Cluster, ClusteringParams } from '@/lib/clustering/types';
import { exportClustersToCSV, exportClustersToJSON, generateClusterExportFilename } from '@/lib/clustering/export';

export default function ClusteringWorkspace() {
  const { toast } = useToast();

  const handleCommit = async (clusters: Cluster[], params: ClusteringParams) => {
    try {
      // Call the clustering-commit Edge Function
      const { data, error } = await supabase.functions.invoke('clustering-commit', {
        body: {
          project_id: 'demo-project', // TODO: Get from actual project selection
          params,
          clusters,
        },
      });

      if (error) {
        throw error;
      }

      // Download CSV
      if (data.csv_content) {
        const csvBlob = new Blob([data.csv_content], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = generateClusterExportFilename('demo', 'csv');
        csvLink.click();
        URL.revokeObjectURL(csvUrl);
      }

      // Download JSON
      if (data.json_content) {
        const jsonBlob = new Blob([data.json_content], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = generateClusterExportFilename('demo', 'json');
        jsonLink.click();
        URL.revokeObjectURL(jsonUrl);
      }

      toast({
        title: 'Success',
        description: `Committed ${data.cluster_ids.length} clusters and exported CSV/JSON`,
      });
    } catch (error) {
      console.error('Commit error:', error);
      throw error;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clustering Workspace</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage keyword clusters using SERP overlap and semantic similarity
        </p>
      </div>

      <ClusterWorkbench onCommit={handleCommit} />
    </div>
  );
}
