import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { exportUserData, downloadDataExport } from '@/lib/account/dataExport';
import { deleteUserAccount, canDeleteAccount } from '@/lib/account/deleteAccount';
import { Download, Trash2, Loader2, AlertTriangle, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export default function Account() {
  const navigate = useNavigate();

  // Redirect to new unified Settings page
  useEffect(() => {
    navigate('/settings?tab=privacy', { replace: true });
  }, [navigate]);

  // Show loading while redirecting
  return (
    <div className="container mx-auto py-8 max-w-4xl flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  // Old content preserved for reference but not rendered
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load onboarding preference
  useEffect(() => {
    const loadOnboardingPref = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('show_onboarding')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setShowOnboarding(profile.show_onboarding ?? true);
        }
      } catch (error) {
        console.error('Error loading onboarding preference:', error);
      }
    };

    loadOnboardingPref();
  }, [user]);

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const result = await exportUserData();

      if (result.success && result.data) {
        downloadDataExport(result.data);
        toast({
          title: 'Export Complete',
          description: 'Your data has been downloaded successfully',
        });
      } else {
        toast({
          title: 'Export Failed',
          description: result.error || 'Unable to export data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Export Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleOnboardingToggle = async (checked: boolean) => {
    if (!user) return;

    setOnboardingLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ show_onboarding: checked })
        .eq('user_id', user.id);

      if (error) throw error;

      setShowOnboarding(checked);
      toast({
        title: 'Preference Updated',
        description: checked 
          ? 'Onboarding tour will show on your next visit to Research'
          : 'Onboarding tour will not show automatically',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Unable to update onboarding preference',
        variant: 'destructive',
      });
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      // Check if deletion is allowed
      const canDelete = await canDeleteAccount();
      if (!canDelete.allowed) {
        toast({
          title: 'Deletion Not Allowed',
          description: canDelete.reason || 'Unable to delete account at this time',
          variant: 'destructive',
        });
        setDeleteLoading(false);
        setDeleteDialogOpen(false);
        return;
      }

      const result = await deleteUserAccount();

      if (result.success) {
        toast({
          title: 'Account Deleted',
          description: 'Your account and data have been deleted. You will be signed out.',
        });
        // User is already signed out by deleteUserAccount
        setTimeout(() => navigate('/'), 2000);
      } else {
        toast({
          title: 'Deletion Failed',
          description: result.error || 'Unable to delete account',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Deletion Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and privacy settings
        </p>
      </div>

      {/* Onboarding Tour Preference */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Tour</CardTitle>
          <CardDescription>
            Control when the product tour appears
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="show-onboarding" className="flex items-center gap-2 cursor-pointer">
                <Play className="h-4 w-4" />
                <span className="font-medium">Show onboarding tour on next visit</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Enable this to see the product tour when you visit the Research page
              </p>
            </div>
            <Switch
              id="show-onboarding"
              checked={showOnboarding}
              onCheckedChange={handleOnboardingToggle}
              disabled={onboardingLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Subject Rights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data Rights</CardTitle>
          <CardDescription>
            Download or delete your personal data in accordance with GDPR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export My Data
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Download a complete copy of your data including research projects, exports, and usage history
                </p>
              </div>
              <Button
                onClick={handleExportData}
                disabled={exportLoading}
                variant="outline"
                className="shrink-0 ml-4"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-start justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
              <div className="flex-1">
                <h3 className="font-semibold flex items-center gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete My Account
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteLoading}
                variant="destructive"
                className="shrink-0 ml-4"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This action cannot be undone. This will permanently delete your account and remove all your data
                from our servers.
              </p>
              <p className="font-semibold">
                This includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All keyword research projects</li>
                <li>Export history and saved snapshots</li>
                <li>Usage statistics and audit logs</li>
                <li>Your profile and preferences</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete My Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
