import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSubscriptionTab } from "./tabs/UserSubscriptionTab";
import { UserRolesTab } from "./tabs/UserRolesTab";
import { UserUsageTab } from "./tabs/UserUsageTab";
import { UserDangerZoneTab } from "./tabs/UserDangerZoneTab";

interface UserData {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  user_roles: any[];
  subscription: any;
}

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onUserDeleted: () => void;
}

export function UserManagementDialog({ open, onOpenChange, user, onUserDeleted }: UserManagementDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Manage User: {user.display_name || user.email || 'Unknown User'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="subscription" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription" className="space-y-4">
            <UserSubscriptionTab user={user} onClose={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <UserRolesTab user={user} />
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <UserUsageTab userId={user.user_id} />
          </TabsContent>

          <TabsContent value="danger" className="space-y-4">
            <UserDangerZoneTab 
              user={user} 
              onClose={() => onOpenChange(false)}
              onUserDeleted={onUserDeleted}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
