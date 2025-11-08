import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, Database } from "lucide-react";
import { UserManagementDialog } from "@/components/admin/UserManagementDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminUsers() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, tier, status');

      if (subsError) throw subsError;

      // Combine the data
      return profiles?.map(profile => ({
        ...profile,
        user_roles: roles?.filter(r => r.user_id === profile.user_id) || [],
        subscription: subscriptions?.find(s => s.user_id === profile.user_id)
      })) || [];
    },
  });

  const handleManageUser = (user: any) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleUserDeleted = () => {
    refetch();
  };

  const deleteAllNonAdminsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('delete_all_non_admin_users');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const deletedCount = data?.length || 0;
      toast.success(`Successfully deleted ${deletedCount} non-admin user(s)`);
      refetch();
      setDeleteAllConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete users: ${error.message}`);
    }
  });

  const purgeSoftDeletedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('purge_soft_deleted_entries');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const totalDeleted = data?.reduce((sum: number, row: any) => sum + Number(row.rows_deleted), 0) || 0;
      toast.success(`Successfully purged ${totalDeleted} soft-deleted entries`);
      setPurgeConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to purge entries: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and roles</p>
        </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and roles</p>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">⚠️ Danger Zone</CardTitle>
          <CardDescription>
            Destructive operations that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              These operations are permanent and cannot be undone. Use with extreme caution.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="destructive"
              onClick={() => setDeleteAllConfirmOpen(true)}
              disabled={deleteAllNonAdminsMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Non-Admin Users
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setPurgeConfirmOpen(true)}
              disabled={purgeSoftDeletedMutation.isPending}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Database className="h-4 w-4 mr-2" />
              Purge Soft-Deleted Entries
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Total: {users?.length ?? 0} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.display_name || 'No name'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {(user as any).subscription?.tier || 'none'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(user as any).subscription?.status === 'active' ? 'default' : 'outline'}>
                      {(user as any).subscription?.status || 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.user_roles && user.user_roles.length > 0 ? (
                        user.user_roles.map((roleObj: any, idx: number) => (
                          <Badge key={idx} variant="secondary">
                            {roleObj.role}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">user</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleManageUser(user)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserManagementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        onUserDeleted={handleUserDeleted}
      />

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Non-Admin Users?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-bold text-destructive">
                This will permanently delete ALL non-admin users and their data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>User profiles and accounts</li>
                <li>All keyword research data</li>
                <li>Competitor analysis reports</li>
                <li>Clusters and exports</li>
                <li>Project snapshots and comments</li>
                <li>Usage statistics and subscriptions</li>
              </ul>
              <p className="font-bold mt-4">
                This action CANNOT be undone. Only admin users will remain.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllNonAdminsMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAllNonAdminsMutation.isPending}
            >
              {deleteAllNonAdminsMutation.isPending ? 'Deleting...' : 'Delete All Non-Admins'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge Soft-Deleted Confirmation Dialog */}
      <AlertDialog open={purgeConfirmOpen} onOpenChange={setPurgeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge Soft-Deleted Entries?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-bold text-destructive">
                This will permanently remove all soft-deleted entries from:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Keyword research (deleted_at IS NOT NULL)</li>
                <li>Project snapshots</li>
                <li>Exports</li>
                <li>Clusters</li>
                <li>Cached results</li>
                <li>Anonymized profiles</li>
              </ul>
              <p className="font-bold mt-4">
                This action CANNOT be undone. Soft-deleted entries will be permanently removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => purgeSoftDeletedMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={purgeSoftDeletedMutation.isPending}
            >
              {purgeSoftDeletedMutation.isPending ? 'Purging...' : 'Purge Soft-Deleted Entries'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
