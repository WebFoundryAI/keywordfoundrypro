import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface StatusComponent {
  id: string;
  name: string;
  description: string | null;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  display_order: number;
}

interface StatusIncident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  created_at: string;
}

export default function StatusAdmin() {
  // Status feature disabled - tables not configured
  const components: StatusComponent[] = [];
  const incidents: StatusIncident[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Status Administration</h1>
        <p className="text-muted-foreground">
          Manage system components and incidents
        </p>
      </div>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Feature Disabled</AlertTitle>
        <AlertDescription>
          The status management tables are not configured in the database. This feature has been temporarily disabled. Contact your system administrator to enable this feature.
        </AlertDescription>
      </Alert>

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle>System Components</CardTitle>
          <CardDescription>
            Update the status of system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>Component management is currently unavailable.</p>
          </div>
        </CardContent>
      </Card>

      {/* Incidents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Incidents</CardTitle>
            <CardDescription>
              Create and manage system incidents
            </CardDescription>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Incident
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>Incident management is currently unavailable.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}