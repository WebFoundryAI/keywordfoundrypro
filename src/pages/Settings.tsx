import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Camera, Download, Trash2, Shield, Bell, User, Lock, CreditCard, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { onboardingStorage } from '@/lib/onboardingStorage';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { exportUserData, downloadDataExport } from '@/lib/account/dataExport';
import { deleteUserAccount } from '@/lib/account/deleteAccount';
import { useQuery } from '@tanstack/react-query';

const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Display name can only contain letters, numbers, and spaces'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'account');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [privacyOptOut, setPrivacyOptOut] = useState(false);
  const [dataRetentionDays, setDataRetentionDays] = useState<string>('90');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Load profile data
  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name || '',
      });
    }
  }, [profile, reset]);

  // Load onboarding preference
  useEffect(() => {
    const loadOnboardingPreference = async () => {
      if (user) {
        setLoadingOnboarding(true);
        try {
          const isCompleted = await onboardingStorage.isCompleted(user.id);
          setShowOnboarding(!isCompleted);
        } catch (error) {
          logger.error('Error loading onboarding preference:', error);
        } finally {
          setLoadingOnboarding(false);
        }
      }
    };
    loadOnboardingPreference();
  }, [user]);

  // Load privacy settings
  useEffect(() => {
    const loadPrivacySettings = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('privacy_opt_out, data_retention_days')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setPrivacyOptOut(data.privacy_opt_out || false);
          setDataRetentionDays(data.data_retention_days?.toString() || '90');
        }
      } catch (error) {
        logger.error('Error loading privacy settings:', error);
      }
    };
    loadPrivacySettings();
  }, [user]);

  // Query for recent audit events
  const { data: auditEvents, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && activeTab === 'activity',
  });

  // Query for API usage (extended to 90 days for better charts)
  const { data: apiUsage, isLoading: apiLoading } = useQuery({
    queryKey: ['dataforseo-usage', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('dataforseo_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && activeTab === 'activity',
  });

  // Process data for charts
  const chartData = React.useMemo(() => {
    if (!apiUsage || apiUsage.length === 0) {
      return { dailyUsage: [], moduleBreakdown: [], costOverTime: [] };
    }

    // Group by date
    const dailyMap = new Map();
    const moduleMap = new Map();
    
    apiUsage.forEach((usage) => {
      const date = new Date(usage.timestamp).toLocaleDateString();
      const module = usage.module || 'Unknown';
      
      // Daily usage
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, calls: 0, cost: 0, credits: 0 });
      }
      const daily = dailyMap.get(date);
      daily.calls += 1;
      daily.cost += Number(usage.cost_usd || 0);
      daily.credits += Number(usage.credits_used || 0);
      
      // Module breakdown
      if (!moduleMap.has(module)) {
        moduleMap.set(module, { name: module, calls: 0, cost: 0, credits: 0 });
      }
      const moduleData = moduleMap.get(module);
      moduleData.calls += 1;
      moduleData.cost += Number(usage.cost_usd || 0);
      moduleData.credits += Number(usage.credits_used || 0);
    });

    const dailyUsage = Array.from(dailyMap.values())
      .reverse()
      .slice(-30); // Last 30 days

    const moduleBreakdown = Array.from(moduleMap.values())
      .sort((a, b) => b.cost - a.cost);

    const costOverTime = dailyUsage.map(d => ({
      date: d.date,
      cost: Number(d.cost.toFixed(4)),
    }));

    return { dailyUsage, moduleBreakdown, costOverTime };
  }, [apiUsage]);

  const userInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  const extractPathFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').slice(3).join('/');
    } catch (error) {
      return null;
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WEBP, or GIF image',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const oldAvatarPath = extractPathFromUrl(profile?.avatar_url || null);
      if (oldAvatarPath) {
        await supabase.storage.from('avatars').remove([oldAvatarPath]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      await updateProfile.mutateAsync({ avatar_url: publicUrl });

      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated successfully',
      });
    } catch (error: any) {
      logger.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync({ display_name: data.display_name });
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleOnboardingToggle = async (checked: boolean) => {
    setShowOnboarding(checked);
    if (user) {
      try {
        if (checked) {
          await onboardingStorage.reset(user.id);
        } else {
          await onboardingStorage.markCompleted(user.id);
        }
        toast({
          title: checked ? 'Onboarding enabled' : 'Onboarding disabled',
          description: checked
            ? 'You will see the tour on your next visit to the research page'
            : 'The onboarding tour has been disabled',
        });
      } catch (error) {
        logger.error('Error updating onboarding preference:', error);
        setShowOnboarding(!checked);
        toast({
          title: 'Update failed',
          description: 'Failed to update onboarding preference',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSavePrivacySettings = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          privacy_opt_out: privacyOptOut,
          data_retention_days: parseInt(dataRetentionDays),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Privacy settings saved',
        description: 'Your privacy preferences have been updated successfully',
      });
    } catch (error: any) {
      logger.error('Error saving privacy settings:', error);
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save privacy settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      const result = await exportUserData();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Export failed');
      }
      
      downloadDataExport(result.data);
      
      toast({
        title: 'Export successful',
        description: 'Your data has been downloaded successfully',
      });
    } catch (error: any) {
      logger.error('Error exporting data:', error);
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export your data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const result = await deleteUserAccount();
      
      if (!result.success) {
        throw new Error(result.error || 'Deletion failed');
      }
      
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted',
      });
      
      navigate('/', { replace: true });
    } catch (error: any) {
      logger.error('Error deleting account:', error);
      toast({
        title: 'Deletion failed',
        description: error.message || 'Failed to delete your account',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                      <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-6 mb-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={profile?.avatar_url || ''} alt="Profile" />
                        <AvatarFallback className="text-xl">
                          {userInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">Profile Picture</p>
                      <p className="text-sm text-muted-foreground">
                        Click the camera icon to update your avatar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Recommended: Square image, at least 400x400px, max 2MB
                      </p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                          id="display_name"
                          {...register('display_name')}
                          placeholder="Enter your display name"
                        />
                        {errors.display_name && (
                          <p className="text-sm text-destructive">
                            {errors.display_name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile?.email || ''}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email address cannot be changed
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => reset()}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding & Tours</CardTitle>
              <CardDescription>
                Control your onboarding experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="show-onboarding">Show onboarding tour</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this to see the product tour again when you visit the research page
                  </p>
                </div>
                <Switch
                  id="show-onboarding"
                  checked={showOnboarding}
                  disabled={loadingOnboarding}
                  onCheckedChange={handleOnboardingToggle}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Manage how your data is collected and stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="privacy-opt-out">Analytics Opt-Out</Label>
                  <p className="text-sm text-muted-foreground">
                    Disable analytics tracking for your account
                  </p>
                </div>
                <Switch
                  id="privacy-opt-out"
                  checked={privacyOptOut}
                  onCheckedChange={setPrivacyOptOut}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="data-retention">Data Retention Period</Label>
                <Select value={dataRetentionDays} onValueChange={setDataRetentionDays}>
                  <SelectTrigger id="data-retention">
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How long we keep your research data before automatic deletion
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Export Your Data</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a copy of all your data in JSON format
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleExportData}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Export My Data
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleSavePrivacySettings}
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Privacy Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <SubscriptionStatus />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          {/* API Usage Charts */}
          {apiUsage && apiUsage.length > 0 && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Daily API Calls & Credits */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily API Usage</CardTitle>
                    <CardDescription>
                      API calls and credits used over the last 30 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData.dailyUsage}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="calls" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="API Calls"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="credits" 
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={2}
                          name="Credits Used"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Cost Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Trends</CardTitle>
                    <CardDescription>
                      Daily API costs over the last 30 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.costOverTime}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                        />
                        <Bar 
                          dataKey="cost" 
                          fill="hsl(var(--chart-1))" 
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Module Breakdown */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Cost by Module</CardTitle>
                    <CardDescription>
                      Distribution of API costs across different modules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.moduleBreakdown}
                          dataKey="cost"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.name}: $${entry.cost.toFixed(3)}`}
                        >
                          {chartData.moduleBreakdown.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => `$${value.toFixed(4)}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Module Statistics</CardTitle>
                    <CardDescription>
                      Detailed breakdown by module
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {chartData.moduleBreakdown.map((module, index) => (
                        <div key={module.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-3 w-3 rounded-full" 
                                style={{ backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))` }}
                              />
                              <span className="text-sm font-medium">{module.name}</span>
                            </div>
                            <Badge variant="outline">{module.calls} calls</Badge>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Cost: ${module.cost.toFixed(4)}</span>
                            <span>Credits: {module.credits.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Recent Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Actions</CardTitle>
              <CardDescription>
                Your recent account activities and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : auditEvents && auditEvents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline">
                            {event.action.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.metadata && typeof event.metadata === 'object' ? (
                            <span>{JSON.stringify(event.metadata).substring(0, 100)}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(event.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent actions found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Usage */}
          <Card>
            <CardHeader>
              <CardTitle>API Usage</CardTitle>
              <CardDescription>
                Your recent DataForSEO API usage and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : apiUsage && apiUsage.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiUsage.map((usage) => (
                      <TableRow key={usage.id}>
                        <TableCell className="font-medium text-sm">
                          {usage.endpoint}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="secondary">{usage.module}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {usage.credits_used ? Number(usage.credits_used).toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {usage.cost_usd ? `$${Number(usage.cost_usd).toFixed(4)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={usage.response_status === 200 ? 'default' : 'destructive'}>
                            {usage.response_status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(usage.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No API usage found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password & Authentication</CardTitle>
              <CardDescription>
                Manage your password and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => navigate('/update-password')}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that will permanently affect your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Deleting your account is permanent and cannot be undone. All your data will be permanently removed.
                </AlertDescription>
              </Alert>

              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </p>
              <p className="font-semibold text-destructive">
                This includes:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Your profile and account information</li>
                <li>All keyword research and analysis data</li>
                <li>Competitor analysis reports</li>
                <li>AI insights and recommendations</li>
                <li>Research history and saved projects</li>
                <li>All files and exports</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
