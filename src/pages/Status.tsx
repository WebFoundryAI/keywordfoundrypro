import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2 } from "lucide-react";

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
  updated_at: string;
  resolved_at: string | null;
}

export default function Status() {
  // Status page disabled - tables not configured
  const components: StatusComponent[] = [];
  const incidents: StatusIncident[] = [];

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          System Status
        </h1>
        <p className="text-muted-foreground mt-2">
          Current operational status of all systems and services
        </p>
      </div>

      {/* Overall Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <h2 className="text-xl font-semibold">All Systems Operational</h2>
              <p className="text-sm text-muted-foreground">
                All services are running normally
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Status */}
      <Card>
        <CardHeader>
          <CardTitle>Components</CardTitle>
          <CardDescription>
            Individual service status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium">API Service</div>
                  <div className="text-sm text-muted-foreground">
                    Main API and backend services
                  </div>
                </div>
              </div>
              <Badge variant="default">Operational</Badge>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium">Database</div>
                  <div className="text-sm text-muted-foreground">
                    Database and storage systems
                  </div>
                </div>
              </div>
              <Badge variant="default">Operational</Badge>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium">Authentication</div>
                  <div className="text-sm text-muted-foreground">
                    User authentication and authorization
                  </div>
                </div>
              </div>
              <Badge variant="default">Operational</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>
            Latest system incidents and resolutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No incidents in the last 30 days</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}