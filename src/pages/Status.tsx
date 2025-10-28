import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle, XCircle, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const statusIcons = {
  operational: CheckCircle2,
  degraded: AlertCircle,
  outage: XCircle,
  maintenance: Wrench
};

const statusColors = {
  operational: 'text-green-500',
  degraded: 'text-yellow-500',
  outage: 'text-red-500',
  maintenance: 'text-blue-500'
};

const statusBadgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  operational: 'default',
  degraded: 'secondary',
  outage: 'destructive',
  maintenance: 'outline'
};

const severityColors = {
  minor: 'border-l-yellow-500',
  major: 'border-l-orange-500',
  critical: 'border-l-red-500'
};

export default function Status() {
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ['status-components'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_components')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as StatusComponent[];
    }
  });

  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['status-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as StatusIncident[];
    }
  });

  const allOperational = components?.every(c => c.status === 'operational');

  if (componentsLoading || incidentsLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            {allOperational ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <h2 className="text-xl font-semibold">All Systems Operational</h2>
                  <p className="text-sm text-muted-foreground">
                    All services are running normally
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
                <div>
                  <h2 className="text-xl font-semibold">Partial System Outage</h2>
                  <p className="text-sm text-muted-foreground">
                    Some services are experiencing issues
                  </p>
                </div>
              </>
            )}
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
            {components?.map((component) => {
              const Icon = statusIcons[component.status];
              return (
                <div
                  key={component.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${statusColors[component.status]}`} />
                    <div>
                      <div className="font-medium">{component.name}</div>
                      {component.description && (
                        <div className="text-sm text-muted-foreground">
                          {component.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariants[component.status]}>
                    {component.status.charAt(0).toUpperCase() + component.status.slice(1)}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      {incidents && incidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>
              Latest system incidents and resolutions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-4 rounded-lg border-l-4 border ${severityColors[incident.severity]}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{incident.title}</div>
                      <p className="text-sm text-muted-foreground">
                        {incident.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(incident.created_at).toLocaleString()}
                        </span>
                        {incident.resolved_at && (
                          <span>• Resolved at {new Date(incident.resolved_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={incident.status === 'resolved' ? 'default' : 'secondary'}>
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
