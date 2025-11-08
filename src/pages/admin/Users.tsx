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
  const [previewUsers, setPreviewUsers] = useState<any[]>([]);

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

  const previewDeletionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('preview_non_admin_users_for_deletion');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setPreviewUsers(data || []);
      setDeleteAllConfirmOpen(true);
    },
    onError: (error: any) => {
      toast.error(`Failed to preview users: ${error.message}`);
    }
  });

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
              onClick={() => previewDeletionMutation.mutate()}
              disabled={previewDeletionMutation.isPending || deleteAllNonAdminsMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {previewDeletionMutation.isPending ? 'Loading Preview...' : 'Delete All Non-Admin Users'}
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

      {/* Delete All Confirmation Dialog with Preview */}
      <AlertDialog open={deleteAllConfirmOpen} onOpenChange={(open) => {
        setDeleteAllConfirmOpen(open);
        if (!open) setPreviewUsers([]);
      }}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {previewUsers.length} Non-Admin User(s)?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>⚠️ Critical Warning</AlertTitle>
                <AlertDescription>
                  This will permanently delete all data for the following users. This action CANNOT be undone.
                </AlertDescription>
              </Alert>

              {previewUsers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  No non-admin users found to delete.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Searches</TableHead>
                          <TableHead className="text-right">Analyses</TableHead>
                          <TableHead className="text-right">Clusters</TableHead>
                          <TableHead className="text-right">Exports</TableHead>
                          <TableHead className="text-right">Snapshots</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewUsers.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{user.display_name || 'No name'}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                <div className="text-xs text-muted-foreground">
                                  Created: {new Date(user.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{user.keyword_research_count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{user.competitor_analysis_count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{user.cluster_count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{user.export_count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{user.snapshot_count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-semibold text-sm">Data to be deleted for each user:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>User profile and account</li>
                      <li>All keyword research and results</li>
                      <li>Competitor analysis reports</li>
                      <li>AI reports and insights</li>
                      <li>Clusters and exports</li>
                      <li>Project snapshots and comments</li>
                      <li>Project shares and research spaces</li>
                      <li>Usage statistics and subscriptions</li>
                      <li>User roles and limits</li>
                    </ul>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllNonAdminsMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAllNonAdminsMutation.isPending || previewUsers.length === 0}
            >
              {deleteAllNonAdminsMutation.isPending ? 'Deleting...' : `Delete ${previewUsers.length} User(s)`}
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
