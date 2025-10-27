import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';

interface Member {
  id: string;
  user_id: string;
  role: 'viewer' | 'commenter' | 'editor' | 'owner';
  created_at: string;
}

interface MemberManagerProps {
  projectId: string;
}

const roleColors = {
  owner: 'bg-purple-500',
  editor: 'bg-blue-500',
  commenter: 'bg-green-500',
  viewer: 'bg-gray-500',
};

const roleDescriptions = {
  owner: 'Full control, can manage members',
  editor: 'Can modify project resources',
  commenter: 'Can add comments',
  viewer: 'Read-only access',
};

export function MemberManager({ projectId }: MemberManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'viewer' | 'commenter' | 'editor'>('viewer');
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  // Fetch members
  const { data: members, isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers: {
          Authorization: `Bearer ${user?.id}`, // In production, use actual token
        },
      });
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      return data.members as Member[];
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { user_id: string; role: string }) => {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          ...data,
          added_by: user?.id,
        }),
      });
      if (!response.ok) throw new Error('Failed to add member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      setNewMemberEmail('');
      setNewMemberRole('viewer');
      toast({
        title: 'Member added',
        description: 'Team member has been added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { user_id: string; role: string }) => {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          ...data,
          updated_by: user?.id,
        }),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast({
        title: 'Role updated',
        description: 'Member role has been updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          user_id: userId,
          removed_by: user?.id,
        }),
      });
      if (!response.ok) throw new Error('Failed to remove member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      setMemberToRemove(null);
      toast({
        title: 'Member removed',
        description: 'Team member has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddMember = () => {
    if (!newMemberEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter a user email or ID',
        variant: 'destructive',
      });
      return;
    }

    addMemberMutation.mutate({
      user_id: newMemberEmail,
      role: newMemberRole,
    });
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({
      user_id: userId,
      role: newRole,
    });
  };

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role;
  const isOwner = currentUserRole === 'owner';

  return (
    <div className="space-y-6">
      {/* Add Member Card */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Add Team Member</CardTitle>
            <CardDescription>
              Invite someone to collaborate on this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="member-email">User Email or ID</Label>
                <Input
                  id="member-email"
                  placeholder="user@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Label htmlFor="member-role">Role</Label>
                <Select
                  value={newMemberRole}
                  onValueChange={(value) =>
                    setNewMemberRole(value as 'viewer' | 'commenter' | 'editor')
                  }
                >
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="commenter">Commenter</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddMember}
                  disabled={addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Add
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {roleDescriptions[newMemberRole]}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : members && members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  {isOwner && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-sm">
                      {member.user_id}
                    </TableCell>
                    <TableCell>
                      {isOwner && member.role !== 'owner' ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleRoleChange(member.user_id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="commenter">Commenter</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={roleColors[member.role]}>
                          {member.role === 'owner' && (
                            <Shield className="h-3 w-3 mr-1" />
                          )}
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No team members yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {memberToRemove?.user_id} from the project. They will
              lose access to all project resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                memberToRemove &&
                removeMemberMutation.mutate(memberToRemove.user_id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
