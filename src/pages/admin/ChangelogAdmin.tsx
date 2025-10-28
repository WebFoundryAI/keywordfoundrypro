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
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);

  const { data: entries } = useQuery({
    queryKey: ['changelog-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('changelog')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ChangelogEntry[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (entry: Partial<ChangelogEntry>) => {
      const { error } = await supabase
        .from('changelog')
        .insert([entry]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-admin'] });
      setDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Changelog entry created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create entry", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...entry }: Partial<ChangelogEntry> & { id: string }) => {
      const { error } = await supabase
        .from('changelog')
        .update(entry)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-admin'] });
      setDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Changelog entry updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update entry", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('changelog')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-admin'] });
      toast({ title: "Changelog entry deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete entry", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const entry = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      content: formData.get('content') as string,
      version: formData.get('version') as string || null,
      category: formData.get('category') as any,
      published: formData.get('published') === 'on'
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, ...entry });
    } else {
      createMutation.mutate(entry);
    }
  };

  const handleEdit = (entry: ChangelogEntry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Changelog Administration</h1>
          <p className="text-muted-foreground">
            Create and manage changelog entries
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Edit Entry' : 'Create Changelog Entry'}
              </DialogTitle>
              <DialogDescription>
                {editingEntry ? 'Update the changelog entry details' : 'Add a new entry to the changelog'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingEntry?.title}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingEntry?.description}
                  required
                />
              </div>
              <div>
                <Label htmlFor="content">Full Content (Markdown/HTML)</Label>
                <Textarea
                  id="content"
                  name="content"
                  rows={8}
                  defaultValue={editingEntry?.content}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="version">Version (optional)</Label>
                  <Input
                    id="version"
                    name="version"
                    placeholder="e.g., 1.2.0"
                    defaultValue={editingEntry?.version || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue={editingEntry?.category || 'improvement'} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  name="published"
                  defaultChecked={editingEntry?.published}
                />
                <Label htmlFor="published">Published</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingEntry(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEntry ? 'Update' : 'Create'} Entry
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Changelog Entries</CardTitle>
          <CardDescription>
            {entries?.length || 0} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entries?.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between p-4 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium">{entry.title}</div>
                    {entry.version && (
                      <Badge variant="outline">{entry.version}</Badge>
                    )}
                    <Badge variant={entry.published ? 'default' : 'secondary'}>
                      {entry.published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge>{categoryLabels[entry.category]}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entry.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created {new Date(entry.created_at).toLocaleDateString()}
                    {entry.published_at && ` • Published ${new Date(entry.published_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(entry)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Delete this entry?')) {
                        deleteMutation.mutate(entry.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {entries?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No changelog entries yet. Click "New Entry" to create one.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
