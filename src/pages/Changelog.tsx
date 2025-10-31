import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

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
  // Changelog feature disabled - table not configured
  const entries: ChangelogEntry[] = [];

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
          <Button variant="outline" size="sm" disabled>
            <Rss className="h-4 w-4 mr-2" />
            RSS Feed
          </Button>
          <Button variant="outline" size="sm" disabled>
            JSON Feed
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Changelog Coming Soon</AlertTitle>
        <AlertDescription>
          The changelog feature is currently being configured. Check back soon for updates on new features and improvements!
        </AlertDescription>
      </Alert>

      {entries.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No changelog entries available at this time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}