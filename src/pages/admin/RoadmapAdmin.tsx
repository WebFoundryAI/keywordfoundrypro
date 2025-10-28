import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Pencil, Trash2, Lightbulb, Calendar, Rocket, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RoadmapItem {
  id: string;
  title: string;
  body: string;
  state: 'idea' | 'planned' | 'in-progress' | 'done';
  created_at: string;
  updated_at: string;
  vote_count?: number;
}

const stateConfig = {
  idea: {
    label: 'Idea',
    icon: Lightbulb,
    color: 'bg-purple-500',
  },
  planned: {
    label: 'Planned',
    icon: Calendar,
    color: 'bg-blue-500',
  },
  'in-progress': {
    label: 'In Progress',
    icon: Rocket,
    color: 'bg-orange-500',
  },
  done: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'bg-green-500',
  },
};

export default function RoadmapAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<RoadmapItem | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idea' | 'planned' | 'in-progress' | 'done'>('idea');

  // Fetch roadmap items
  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-roadmap'],
    queryFn: async () => {
      const response = await fetch('/api/roadmap');
      if (!response.ok) throw new Error('Failed to fetch roadmap');
      const data = await response.json();
      return data.items as RoadmapItem[];
    },
  });

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; state: string }) => {
      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      resetForm();
      setCreateDialogOpen(false);
      toast({
        title: 'Item created',
        description: 'Roadmap item has been added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; body: string; state: string }) => {
      const response = await fetch(`/api/roadmap/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          body: data.body,
          state: data.state,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      resetForm();
      setEditingItem(null);
      toast({
        title: 'Item updated',
        description: 'Roadmap item has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/roadmap/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      setItemToDelete(null);
      toast({
        title: 'Item deleted',
        description: 'Roadmap item has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setBody('');
    setState('idea');
  };

  const handleCreate = () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate({ title, body, state });
  };

  const handleUpdate = () => {
    if (!editingItem || !title.trim() || !body.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate({
      id: editingItem.id,
      title,
      body,
      state,
    });
  };

  const openEditDialog = (item: RoadmapItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setBody(item.body);
    setState(item.state);
  };

  const closeEditDialog = () => {
    setEditingItem(null);
    resetForm();
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roadmap Management</h1>
          <p className="text-muted-foreground">Manage product roadmap items and states</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap Items</CardTitle>
          <CardDescription>
            Total: {items?.length ?? 0} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items && items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Votes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const StateIcon = stateConfig[item.state].icon;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-md">
                        <div>
                          <div className="font-semibold">{item.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {item.body}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-white', stateConfig[item.state].color)}>
                          <StateIcon className="h-3 w-3 mr-1" />
                          {stateConfig[item.state].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.vote_count || 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setItemToDelete(item)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No roadmap items yet. Create your first item to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            closeEditDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Create'} Roadmap Item</DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the roadmap item details and state'
                : 'Add a new item to the product roadmap'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Feature title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="body">Description *</Label>
              <Textarea
                id="body"
                placeholder="Detailed description of the feature or improvement"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={(value) => setState(value as typeof state)}>
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                closeEditDialog();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingItem ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete roadmap item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{itemToDelete?.title}" and all associated votes.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
