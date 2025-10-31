import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Save, FolderOpen, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SnapshotState {
  filters?: Record<string, any>;
  sort?: { column: string; direction: 'asc' | 'desc' };
  pagination?: { page: number; pageSize: number };
  selectedColumns?: string[];
}

export interface Snapshot {
  id: string;
  name: string;
  state: SnapshotState;
  project_id: string | null;
  created_at: string;
}

interface SnapshotBarProps {
  projectId?: string;
  currentState: SnapshotState;
  onLoadSnapshot: (state: SnapshotState) => void;
}

export function SnapshotBar({ projectId, currentState, onLoadSnapshot }: SnapshotBarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');

  // Fetch user's snapshots
  const { data: snapshots, isLoading } = useQuery({
    queryKey: ['snapshots', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('project_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        query = query.is('project_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Snapshot[];
    },
  });

  // Save snapshot mutation
  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_snapshots')
        .insert([{
          user_id: user.id,
          project_id: projectId || null,
          name,
          state: currentState as any,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots', projectId] });
      setSaveDialogOpen(false);
      setSnapshotName('');
      toast({
        title: 'Snapshot saved',
        description: 'Your current state has been saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save snapshot',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete snapshot mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_snapshots')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots', projectId] });
      toast({
        title: 'Snapshot deleted',
        description: 'The snapshot has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete snapshot',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!snapshotName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your snapshot.',
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate(snapshotName);
  };

  const handleLoad = (snapshot: Snapshot) => {
    onLoadSnapshot(snapshot.state);
    setLoadDialogOpen(false);
    toast({
      title: 'Snapshot loaded',
      description: `Loaded: ${snapshot.name}`,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete snapshot "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Snapshot */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Snapshot
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Snapshot</DialogTitle>
            <DialogDescription>
              Save your current filters, sorting, and view settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="snapshot-name">Snapshot Name</Label>
              <Input
                id="snapshot-name"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="e.g., High-volume keywords"
                autoFocus
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>This snapshot will save:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Active filters</li>
                <li>Sort order</li>
                <li>Pagination settings</li>
                <li>Visible columns</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Snapshot'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Snapshot */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-2" />
            Load Snapshot
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Load Snapshot</DialogTitle>
            <DialogDescription>
              Restore a previously saved state
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading snapshots...
              </div>
            )}

            {!isLoading && (!snapshots || snapshots.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No saved snapshots yet.</p>
                <p className="text-sm mt-2">
                  Click "Save Snapshot" to save your current view.
                </p>
              </div>
            )}

            {snapshots && snapshots.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{snapshot.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Saved {new Date(snapshot.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLoad(snapshot)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(snapshot.id, snapshot.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
