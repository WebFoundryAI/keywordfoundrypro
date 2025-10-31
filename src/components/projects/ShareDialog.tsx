import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Share2, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ProjectShare {
  id: string;
  project_id: string;
  shared_with_email: string;
  permission: 'viewer' | 'commenter' | 'editor';
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ShareDialogProps {
  projectId: string;
  projectName?: string;
}

const permissionLabels = {
  viewer: 'Can view',
  commenter: 'Can comment',
  editor: 'Can edit',
};

const permissionDescriptions = {
  viewer: 'View project data only',
  commenter: 'View and add comments',
  editor: 'View, comment, and modify',
};

export function ShareDialog({ projectId, projectName }: ShareDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'commenter' | 'editor'>('viewer');

  // Fetch existing shares
  const { data: shares, isLoading } = useQuery({
    queryKey: ['project-shares', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_shares')
        .select(`
          *,
          shared_with_profile:profiles!shared_with_user_id(display_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(share => ({
        ...share,
        profiles: share.shared_with_profile || { display_name: '', avatar_url: '' }
      })) as ProjectShare[];
    },
    enabled: open,
  });

  // Share project mutation
  const shareMutation = useMutation({
    mutationFn: async ({ email, permission }: { email: string; permission: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find user by email
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      if (userError || !targetUser) {
        throw new Error('User not found with that email');
      }

      // Create share
      const { error } = await supabase
        .from('project_shares')
        .insert({
          project_id: projectId,
          shared_by_user_id: user.id,
          shared_with_user_id: targetUser.user_id,
          shared_with_email: email,
          permission,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Project already shared with this user');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-shares', projectId] });
      setEmail('');
      setPermission('viewer');
      toast({
        title: 'Project shared',
        description: `Shared with ${email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to share project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove share mutation
  const removeMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('project_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-shares', projectId] });
      toast({
        title: 'Access removed',
        description: 'User no longer has access to this project',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove access',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ shareId, permission }: { shareId: string; permission: string }) => {
      const { error } = await supabase
        .from('project_shares')
        .update({ permission })
        .eq('id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-shares', projectId] });
      toast({
        title: 'Permission updated',
        description: 'User permission has been changed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update permission',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleShare = () => {
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    shareMutation.mutate({ email, permission });
  };

  const handleRemove = (shareId: string) => {
    if (confirm('Remove access for this user?')) {
      removeMutation.mutate(shareId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            {projectName ? `Share "${projectName}" with team members` : 'Share this project with team members'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new share */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                />
              </div>
              <div className="w-[180px]">
                <Label htmlFor="permission">Permission</Label>
                <Select value={permission} onValueChange={(v: any) => setPermission(v)}>
                  <SelectTrigger id="permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div>
                        <div className="font-medium">{permissionLabels.viewer}</div>
                        <div className="text-xs text-muted-foreground">
                          {permissionDescriptions.viewer}
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="commenter">
                      <div>
                        <div className="font-medium">{permissionLabels.commenter}</div>
                        <div className="text-xs text-muted-foreground">
                          {permissionDescriptions.commenter}
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div>
                        <div className="font-medium">{permissionLabels.editor}</div>
                        <div className="text-xs text-muted-foreground">
                          {permissionDescriptions.editor}
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleShare}
              disabled={shareMutation.isPending}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {shareMutation.isPending ? 'Sharing...' : 'Share Project'}
            </Button>
          </div>

          {/* Existing shares */}
          <div className="space-y-2">
            <Label>People with access</Label>
            {isLoading && (
              <div className="text-center py-4 text-muted-foreground">
                Loading...
              </div>
            )}

            {!isLoading && (!shares || shares.length === 0) && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No one else has access yet
              </div>
            )}

            {shares && shares.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {share.profiles?.display_name || share.shared_with_email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {share.shared_with_email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={share.permission}
                        onValueChange={(v) =>
                          updatePermissionMutation.mutate({ shareId: share.id, permission: v })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">{permissionLabels.viewer}</SelectItem>
                          <SelectItem value="commenter">{permissionLabels.commenter}</SelectItem>
                          <SelectItem value="editor">{permissionLabels.editor}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(share.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
