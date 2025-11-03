import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";

interface DiagnosticTest {
  running: boolean;
  result: any;
  error: any;
}

export default function ConnectionDiagnostic() {
  const [diagnosticTest, setDiagnosticTest] = useState<DiagnosticTest | null>(null);

  const runDiagnosticTest = async () => {
    setDiagnosticTest({ running: true, result: null, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('competitor-analyze', {
        body: { op: 'health' }
      });

      setDiagnosticTest({ running: false, result: data, error });
    } catch (err) {
      setDiagnosticTest({ running: false, result: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Connection Diagnostic Tool</h1>
          <p className="text-muted-foreground">
            Test if the Edge Function is deployed and DataForSEO credentials are configured
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🔧 Connection Diagnostic Tool
            </CardTitle>
            <CardDescription>
              Test if the Edge Function is deployed and DataForSEO credentials are configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runDiagnosticTest}
              disabled={diagnosticTest?.running}
              variant="outline"
            >
              {diagnosticTest?.running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Connection Test
                </>
              )}
            </Button>

            {diagnosticTest && !diagnosticTest.running && (
              <div className="space-y-3 p-4 bg-white rounded-md border">
                {diagnosticTest.error ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600 font-semibold">
                      ❌ Edge Function NOT Deployed
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Error:</strong> {diagnosticTest.error.message || 'Failed to connect to Edge Function'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>What this means:</strong> The competitor-analyze Edge Function is not deployed to Supabase.
                    </p>
                    <p className="text-sm text-blue-600">
                      <strong>How to fix:</strong> Deploy the Edge Function via Loveable.dev or Supabase CLI.
                    </p>
                  </div>
                ) : diagnosticTest.result?.ok ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      ✅ Edge Function Deployed
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        {diagnosticTest.result.data?.d4s_creds_present ? (
                          <>
                            <span className="text-green-600">✅</span>
                            <span>DataForSEO credentials are configured</span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-600">❌</span>
                            <span className="text-red-600">DataForSEO credentials are MISSING</span>
                          </>
                        )}
                      </div>
                      {!diagnosticTest.result.data?.d4s_creds_present && (
                        <p className="text-sm text-blue-600 mt-2">
                          <strong>How to fix:</strong> Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to Supabase Edge Function secrets.
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Request ID: {diagnosticTest.result.request_id}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-600 font-semibold">
                      ⚠️ Unexpected Response
                    </div>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(diagnosticTest.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
