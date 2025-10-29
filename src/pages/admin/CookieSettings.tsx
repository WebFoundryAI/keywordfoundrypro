/**
 * Admin-only Cookie Banner Settings Page
 * Allows admins to toggle the cookie banner for EEA/UK visitors
 * Path: /admin/cookie-settings
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCookieBannerEnabled, setCookieBannerEnabled } from '@/lib/siteSettings';
import { useToast } from '@/hooks/use-toast';

export default function CookieSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialValue, setInitialValue] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);
      const currentValue = await getCookieBannerEnabled();
      setEnabled(currentValue);
      setInitialValue(currentValue);
      setHasChanges(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to load settings');
      console.error('Failed to load cookie banner settings:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    setHasChanges(checked !== initialValue);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      await setCookieBannerEnabled(enabled);
      setInitialValue(enabled);
      setHasChanges(false);
      toast({
        title: 'Settings saved',
        description: enabled
          ? 'Cookie banner is now enabled for EEA/UK visitors'
          : 'Cookie banner is now hidden for all visitors',
      });
    } catch (err: any) {
      const message = err?.message || 'Failed to save settings';
      setError(message);
      toast({
        title: 'Error saving settings',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setEnabled(initialValue);
    setHasChanges(false);
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Cookie Banner Settings</h1>
          <p className="text-muted-foreground mt-1">
            Control cookie consent banner visibility for GDPR compliance
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Cookie Banner Visibility
          </CardTitle>
          <CardDescription>
            Configure when the cookie consent banner is shown to visitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="cookie-banner-enabled" className="text-base font-medium">
                Enable Cookie Banner (EEA/UK only)
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, visitors from European Economic Area (EEA) and United Kingdom
                will see a cookie consent banner on their first visit. Visitors from other
                regions will not see the banner.
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Automatically detects visitor location</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>GDPR compliant consent management</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>24-hour geo location caching</span>
                </div>
              </div>
            </div>
            <Switch
              id="cookie-banner-enabled"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading || saving}
              className="mt-1"
            />
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Default: OFF</strong> - The cookie banner is hidden by default to minimize
              friction for non-EEA/UK visitors. Enable this setting only when you need to comply
              with GDPR cookie consent requirements.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving || loading}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving || loading}
              >
                Reset
              </Button>
            )}
            {!hasChanges && !loading && (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                All changes saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">1. Admin Control</strong>
            <p>You control the banner visibility through this admin panel. The setting is stored in the database.</p>
          </div>
          <div>
            <strong className="text-foreground">2. Geo Detection</strong>
            <p>When enabled, the system detects the visitor's location using their IP address. Results are cached for 24 hours.</p>
          </div>
          <div>
            <strong className="text-foreground">3. Consent Check</strong>
            <p>If the visitor is from EEA/UK and hasn't consented yet, they see the banner on their first visit.</p>
          </div>
          <div>
            <strong className="text-foreground">4. Privacy First</strong>
            <p>Once consent is given or denied, the banner won't show again for that visitor.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
