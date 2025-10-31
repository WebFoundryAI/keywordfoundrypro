import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  content: string;
  version: string | null;
  category: 'feature' | 'improvement' | 'fix' | 'breaking';
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  feature: 'Feature',
  improvement: 'Improvement',
  fix: 'Bug Fix',
  breaking: 'Breaking Change'
};

export default function ChangelogAdmin() {
  // Changelog feature disabled - table not configured
  const entries: ChangelogEntry[] = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Changelog Administration</h1>
          <p className="text-muted-foreground">
            Create and manage changelog entries
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Feature Disabled</AlertTitle>
        <AlertDescription>
          The changelog table is not configured in the database. This feature has been temporarily disabled. Contact your system administrator to enable this feature.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Changelog Entries</CardTitle>
          <CardDescription>
            {entries.length} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>Changelog management is currently unavailable.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}