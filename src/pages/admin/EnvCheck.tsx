import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnvCheckResult {
  name: string;
  present: boolean;
  required: boolean;
  category: string;
}

interface EnvCheckResponse {
  timestamp: string;
  status: 'healthy' | 'missing_required';
  summary: {
    required: { total: number; present: number; missing: number };
    optional: { total: number; present: number; missing: number };
  };
  variables: EnvCheckResult[];
  warnings: string[];
}

const EnvCheck = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['env-check'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<EnvCheckResponse>('env-check');
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking environment configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to check environment: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const groupedVars: Record<string, EnvCheckResult[]> = {};
  data?.variables.forEach((v) => {
    if (!groupedVars[v.category]) {
      groupedVars[v.category] = [];
    }
    groupedVars[v.category].push(v);
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Environment Check</h1>
          <p className="text-muted-foreground mt-1">
            Verify required environment variables are configured
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.status === 'healthy' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            Configuration Status
          </CardTitle>
          <CardDescription>
            Last checked: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Required Variables</p>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {data?.summary.required.present} / {data?.summary.required.total}
                </div>
                <Badge variant={data?.summary.required.missing === 0 ? "default" : "destructive"}>
                  {data?.summary.required.missing === 0 ? 'All Present' : `${data?.summary.required.missing} Missing`}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Optional Variables</p>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {data?.summary.optional.present} / {data?.summary.optional.total}
                </div>
                <Badge variant="outline">
                  {data?.summary.optional.present} Configured
                </Badge>
              </div>
            </div>
          </div>

          {data?.warnings && data.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Issues</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {data.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Variables by Category */}
      {Object.entries(groupedVars).map(([category, vars]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
            <CardDescription>
              {vars.filter(v => v.present).length} of {vars.length} variables configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vars.map((envVar) => (
                <div
                  key={envVar.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {envVar.present ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-mono text-sm font-medium">{envVar.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {envVar.required ? 'Required' : 'Optional'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={envVar.present ? "default" : envVar.required ? "destructive" : "outline"}>
                    {envVar.present ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Documentation Link */}
      <Alert>
        <AlertDescription>
          📖 For detailed information about environment variables, see{' '}
          <a href="/docs/env.md" className="font-medium underline">
            docs/env.md
          </a>
          {' '}or configure secrets in{' '}
          <a 
            href="https://supabase.com/dashboard/project/oobxytqzbnvtspodjjop/settings/functions"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            Supabase Dashboard
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default EnvCheck;
