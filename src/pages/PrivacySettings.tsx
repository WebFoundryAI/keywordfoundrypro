import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  const { toast } = useToast();

  const [privacyOptOut, setPrivacyOptOut] = useState(false);
  const [dataRetentionDays, setDataRetentionDays] = useState<30 | 90 | 365>(90);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (profile) {
      setPrivacyOptOut((profile as any).privacy_opt_out || false);
      setDataRetentionDays(((profile as any).data_retention_days as 30 | 90 | 365) || 90);
    }
  }, [profile]);

  const handleSavePrivacySettings = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          privacy_opt_out: privacyOptOut,
          data_retention_days: dataRetentionDays,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Privacy settings updated',
        description: 'Your privacy preferences have been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to update settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Privacy Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your privacy preferences and data retention settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Analytics Opt-Out */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <CardTitle>Analytics & Tracking</CardTitle>
            </div>
            <CardDescription>
              Control what usage data we collect about your activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="analytics-opt-out">Opt out of analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Disable non-essential analytics and feature usage tracking
                </p>
              </div>
              <Switch
                id="analytics-opt-out"
                checked={privacyOptOut}
                onCheckedChange={setPrivacyOptOut}
              />
            </div>

            {privacyOptOut && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">What this means:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Feature usage analytics will not be collected</li>
                  <li>Page view tracking will be disabled</li>
                  <li>Button click events will not be logged</li>
                </ul>
                <p className="text-sm font-medium mt-3">What we still log:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Authentication and security events</li>
                  <li>Billing and subscription changes</li>
                  <li>Error logs for debugging purposes</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <CardTitle>Data Retention</CardTitle>
            </div>
            <CardDescription>
              How long we keep your activity logs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="retention-period">Retention Period</Label>
              <Select
                value={dataRetentionDays.toString()}
                onValueChange={(value) =>
                  setDataRetentionDays(parseInt(value) as 30 | 90 | 365)
                }
              >
                <SelectTrigger id="retention-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days (recommended)</SelectItem>
                  <SelectItem value="365">365 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Activity logs older than this will be automatically deleted
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">
                <strong>Current setting:</strong> Activity logs will be retained for{' '}
                <strong>{dataRetentionDays} days</strong>, then automatically purged.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PII Protection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Personal Information Protection</CardTitle>
            </div>
            <CardDescription>
              How we protect your personally identifiable information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm">
                We automatically redact the following information from all logs:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Email addresses</li>
                <li>IP addresses</li>
                <li>Phone numbers</li>
                <li>Credit card information</li>
                <li>Social security numbers</li>
              </ul>
              <p className="text-sm mt-4">
                This protection is <strong>always enabled</strong> and cannot be disabled.
                Your sensitive information is never stored in plain text in our logs.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {
              if (profile) {
                setPrivacyOptOut((profile as any).privacy_opt_out || false);
                setDataRetentionDays(((profile as any).data_retention_days as 30 | 90 | 365) || 90);
              }
            }}
          >
            Reset
          </Button>
          <Button
            onClick={handleSavePrivacySettings}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>

        {/* Additional Info */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              For more information about how we handle your data, please review our{' '}
              <a href="/privacy" className="text-primary underline">
                Privacy Policy
              </a>
              . If you have questions about data deletion or export, please{' '}
              <a href="/contact" className="text-primary underline">
                contact support
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
