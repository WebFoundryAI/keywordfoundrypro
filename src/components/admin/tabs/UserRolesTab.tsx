import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

interface UserRolesTabProps {
  user: any;
}

export function UserRolesTab({ user }: UserRolesTabProps) {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const currentRoles = user.user_roles || [];

  const addRole = useMutation({
    mutationFn: async (role: string) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: user.user_id, 
          role: role as 'admin' | 'moderator' | 'user'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Role added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add role", description: error.message, variant: "destructive" });
    },
  });

  const removeRole = useMutation({
    mutationFn: async (role: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id)
        .eq('role', role as 'admin' | 'moderator' | 'user');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Role removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove role", description: error.message, variant: "destructive" });
    },
  });

  const handleAddRole = () => {
    if (currentRoles.some((r: any) => r.role === selectedRole)) {
      toast({ title: "User already has this role", variant: "destructive" });
      return;
    }
    addRole.mutate(selectedRole);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Current Roles</h3>
        <div className="flex flex-wrap gap-2">
          {currentRoles.length > 0 ? (
            currentRoles.map((roleObj: any, idx: number) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-2">
                {roleObj.role}
                <button
                  onClick={() => removeRole.mutate(roleObj.role)}
                  className="hover:text-destructive"
                  disabled={removeRole.isPending}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <Badge variant="outline">No roles assigned</Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Add New Role</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="sr-only">Select Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleAddRole} 
            disabled={addRole.isPending}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <h4 className="font-medium mb-2">Role Permissions</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><strong>User:</strong> Standard access to all features</li>
          <li><strong>Moderator:</strong> Can moderate content</li>
          <li><strong>Admin:</strong> Full system access including user management</li>
        </ul>
      </div>
    </div>
  );
}
