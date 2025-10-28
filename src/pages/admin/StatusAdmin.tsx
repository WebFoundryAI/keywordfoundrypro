import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2 } from "lucide-react";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<StatusComponent | null>(null);

  const { data: components } = useQuery({
    queryKey: ['status-components-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_components')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as StatusComponent[];
    }
  });

  const { data: incidents } = useQuery({
    queryKey: ['status-incidents-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_incidents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StatusIncident[];
    }
  });

  const updateComponentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('status_components')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-components-admin'] });
      toast({ title: "Component updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update component", variant: "destructive" });
    }
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (incident: Partial<StatusIncident>) => {
      const { error } = await supabase
        .from('status_incidents')
        .insert([incident]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-incidents-admin'] });
      setIncidentDialogOpen(false);
      toast({ title: "Incident created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create incident", variant: "destructive" });
    }
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('status_incidents')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-incidents-admin'] });
      toast({ title: "Incident updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update incident", variant: "destructive" });
    }
  });

  const handleIncidentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createIncidentMutation.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      severity: formData.get('severity') as any,
      status: 'investigating'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Status Administration</h1>
        <p className="text-muted-foreground">
          Manage system components and incidents
        </p>
      </div>

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle>System Components</CardTitle>
          <CardDescription>
            Update the status of system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {components?.map((component) => (
              <div
                key={component.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div>
                  <div className="font-medium">{component.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {component.description}
                  </div>
                </div>
                <Select
                  value={component.status}
                  onValueChange={(value) =>
                    updateComponentMutation.mutate({ id: component.id, status: value })
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="degraded">Degraded</SelectItem>
                    <SelectItem value="outage">Outage</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
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
          <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Incident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Incident</DialogTitle>
                <DialogDescription>
                  Report a new system incident
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleIncidentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" required />
                </div>
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select name="severity" defaultValue="minor" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIncidentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Incident</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {incidents?.map((incident) => (
              <div
                key={incident.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="font-medium">{incident.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {incident.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(incident.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{incident.severity}</Badge>
                  <Select
                    value={incident.status}
                    onValueChange={(value) =>
                      updateIncidentMutation.mutate({ id: incident.id, status: value })
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="identified">Identified</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {incidents?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No incidents reported. Click "New Incident" to create one.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
