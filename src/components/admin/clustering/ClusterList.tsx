import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { Cluster } from '@/lib/clustering/types';
import { Edit2, Trash2 } from 'lucide-react';

interface ClusterListProps {
  clusters: Cluster[];
  selectedClusterId?: string;
  selectedForMerge: Set<string>;
  onSelectCluster: (clusterId: string) => void;
  onToggleMergeSelection: (clusterId: string) => void;
  onRename: (clusterId: string) => void;
  onDelete: (clusterId: string) => void;
}

export function ClusterList({
  clusters,
  selectedClusterId,
  selectedForMerge,
  onSelectCluster,
  onToggleMergeSelection,
  onRename,
  onDelete,
}: ClusterListProps) {
  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-2 pr-4">
        {clusters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No clusters created yet</p>
            <p className="text-sm mt-2">
              Adjust parameters and create clusters to preview
            </p>
          </div>
        ) : (
          clusters.map((cluster, index) => {
            const clusterId = cluster.id || `preview-${index}`;
            const isSelected = clusterId === selectedClusterId;
            const isMergeSelected = selectedForMerge.has(clusterId);

            return (
              <div
                key={clusterId}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-colors
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                `}
                onClick={() => onSelectCluster(clusterId)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isMergeSelected}
                    onCheckedChange={() => onToggleMergeSelection(clusterId)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-sm truncate">
                        {cluster.name}
                      </h4>
                      <Badge variant="secondary" className="shrink-0">
                        {cluster.members.length}
                      </Badge>
                    </div>
                    {cluster.representative && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Pillar: {cluster.representative}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRename(clusterId);
                      }}
                      className="h-7 w-7"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(clusterId);
                      }}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
