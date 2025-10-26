import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Calendar } from 'lucide-react';
import {
  getSerpSnapshot,
  enhanceSerpResults,
  type SerpResult,
  type SerpSnapshot,
} from '@/lib/results/serpSnapshots';
import { formatDistanceToNow } from 'date-fns';

interface SerpSnapshotPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  keyword: string;
}

const TYPE_COLORS: Record<SerpResult['type'], string> = {
  blog: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  product: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  forum: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  directory: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  news: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  video: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function SerpSnapshotPanel({
  open,
  onOpenChange,
  projectId,
  keyword,
}: SerpSnapshotPanelProps) {
  const [snapshot, setSnapshot] = useState<SerpSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && projectId && keyword) {
      loadSnapshot();
    }
  }, [open, projectId, keyword]);

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getSerpSnapshot(projectId, keyword);

      if (!data) {
        setError('No SERP snapshot available for this keyword');
        setSnapshot(null);
      } else {
        setSnapshot({
          ...data,
          results: enhanceSerpResults(data.results),
        });
      }
    } catch (err) {
      console.error('Error loading SERP snapshot:', err);
      setError('Failed to load SERP snapshot');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>SERP Snapshot</SheetTitle>
          <SheetDescription>
            {keyword && (
              <>
                Top results for <span className="font-semibold">{keyword}</span>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </>
          )}

          {error && (
            <div className="text-center py-8 text-muted-foreground">
              <p>{error}</p>
              <p className="text-sm mt-2">
                SERP snapshots are captured when you run keyword research
              </p>
            </div>
          )}

          {!loading && !error && snapshot && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4 border-b">
                <Calendar className="h-4 w-4" />
                <span>
                  Captured{' '}
                  {formatDistanceToNow(new Date(snapshot.capturedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="space-y-4">
                {snapshot.results.map((result) => (
                  <div
                    key={result.position}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-semibold text-sm">
                        {result.position}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                          {result.favicon && (
                            <img
                              src={result.favicon}
                              alt=""
                              className="w-4 h-4 mt-1 flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline line-clamp-2 flex-1"
                          >
                            {result.title}
                          </a>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-muted-foreground truncate">
                            {result.domain}
                          </p>
                          <Badge
                            variant="secondary"
                            className={TYPE_COLORS[result.type]}
                          >
                            {result.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {snapshot.results.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No results in this snapshot</p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
