import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserDangerZoneTabProps {
  user: any;
  onClose: () => void;
  onUserDeleted: () => void;
}

export function UserDangerZoneTab({ user, onClose, onUserDeleted }: UserDangerZoneTabProps) {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const deleteUser = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "User deleted successfully" });
      onUserDeleted();
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (confirmEmail !== user.email) {
      toast({ 
        title: "Email doesn't match", 
        description: "Please enter the correct email address to confirm deletion",
        variant: "destructive" 
      });
      return;
    }
    deleteUser.mutate();
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-destructive mb-2">Delete User Account</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. This will permanently delete the user account and all associated data including:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
              <li>User profile information</li>
              <li>Subscription data</li>
              <li>User roles and permissions</li>
              <li>All keyword research records</li>
              <li>All keyword results</li>
              <li>Usage statistics</li>
            </ul>
            <Button 
              variant="destructive" 
              onClick={handleDeleteClick}
              disabled={deleteUser.isPending}
            >
              Delete User Account
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. To confirm deletion, please type the user's email address below:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label>Email: {user.email}</Label>
            <Input
              placeholder="Enter email to confirm"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmEmail("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={confirmEmail !== user.email}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
