import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Rss } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  content: string;
  version: string | null;
  category: 'feature' | 'improvement' | 'fix' | 'breaking';
  published_at: string;
}

const categoryColors: Record<string, string> = {
  feature: 'bg-blue-500',
  improvement: 'bg-green-500',
  fix: 'bg-yellow-500',
  breaking: 'bg-red-500'
};

const categoryLabels: Record<string, string> = {
  feature: 'New Feature',
  improvement: 'Improvement',
  fix: 'Bug Fix',
  breaking: 'Breaking Change'
};

export default function Changelog() {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['changelog-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('changelog')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data as ChangelogEntry[];
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Changelog
          </h1>
          <p className="text-muted-foreground mt-2">
            Latest updates, features, and improvements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/changelog/feed.rss" target="_blank" rel="noopener noreferrer">
              <Rss className="h-4 w-4 mr-2" />
              RSS Feed
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/changelog/feed.json" target="_blank" rel="noopener noreferrer">
              JSON Feed
            </a>
          </Button>
        </div>
      </div>

      {entries && entries.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No changelog entries yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {entries?.map((entry) => (
          <Card key={entry.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{entry.title}</CardTitle>
                  <CardDescription>
                    {new Date(entry.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {entry.version && ` • Version ${entry.version}`}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`${categoryColors[entry.category]} text-white border-0`}
                >
                  {categoryLabels[entry.category]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {entry.description}
              </p>
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: entry.content }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
