import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Cluster } from '@/lib/clustering/types';
import { Crown } from 'lucide-react';
import { useState } from 'react';

interface ClusterPreviewProps {
  cluster: Cluster | null;
  onSplit: (selectedKeywords: string[]) => void;
}

export function ClusterPreview({ cluster, onSplit }: ClusterPreviewProps) {
  const [selectedForSplit, setSelectedForSplit] = useState<Set<string>>(
    new Set()
  );

  if (!cluster) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cluster Preview</CardTitle>
          <CardDescription>
            Select a cluster from the list to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No cluster selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggleSplit = (keyword: string) => {
    const newSet = new Set(selectedForSplit);
    if (newSet.has(keyword)) {
      newSet.delete(keyword);
    } else {
      newSet.add(keyword);
    }
    setSelectedForSplit(newSet);
  };

  const handleSplit = () => {
    if (selectedForSplit.size > 0) {
      onSplit(Array.from(selectedForSplit));
      setSelectedForSplit(new Set());
    }
  };

  const pillar = cluster.members.find((m) => m.is_representative);
  const supports = cluster.members.filter((m) => !m.is_representative);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{cluster.name}</CardTitle>
            <CardDescription>
              {cluster.members.length} keywords total
            </CardDescription>
          </div>
          {selectedForSplit.size > 0 && (
            <Button onClick={handleSplit} size="sm">
              Split Selected ({selectedForSplit.size})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px]">
          <div className="space-y-4 pr-4">
            {/* Pillar Keyword */}
            {pillar && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  Pillar Keyword
                </h4>
                <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedForSplit.has(pillar.keyword_text)}
                      onCheckedChange={() =>
                        handleToggleSplit(pillar.keyword_text)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{pillar.keyword_text}</p>
                      {pillar.serp_titles && pillar.serp_titles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Top SERP Results:
                          </p>
                          {pillar.serp_titles.slice(0, 5).map((title, i) => (
                            <div key={i} className="text-xs">
                              <span className="text-muted-foreground">
                                {i + 1}.
                              </span>{' '}
                              {title}
                              {pillar.serp_urls?.[i] && (
                                <a
                                  href={pillar.serp_urls[i]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-primary hover:underline"
                                >
                                  ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Support Keywords */}
            {supports.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Support Keywords ({supports.length})
                </h4>
                <div className="space-y-2">
                  {supports.map((member) => (
                    <div
                      key={member.keyword_text}
                      className="p-3 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedForSplit.has(member.keyword_text)}
                          onCheckedChange={() =>
                            handleToggleSplit(member.keyword_text)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{member.keyword_text}</p>
                          {member.serp_titles &&
                            member.serp_titles.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Top SERP Results:
                                </p>
                                {member.serp_titles
                                  .slice(0, 3)
                                  .map((title, i) => (
                                    <div key={i} className="text-xs">
                                      <span className="text-muted-foreground">
                                        {i + 1}.
                                      </span>{' '}
                                      {title}
                                      {member.serp_urls?.[i] && (
                                        <a
                                          href={member.serp_urls[i]}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ml-2 text-primary hover:underline"
                                        >
                                          ↗
                                        </a>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
