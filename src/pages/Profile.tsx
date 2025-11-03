import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { onboardingStorage } from '@/lib/onboardingStorage';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Display name can only contain letters, numbers, and spaces'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  const { toast } = useToast();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: researchHistory, isLoading: researchLoading } = useQuery({
    queryKey: ['user-research-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('keyword_research')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth/sign-in');
    }
  }, [user, navigate]);

  // Load onboarding preference
  useEffect(() => {
    const loadOnboardingPreference = async () => {
      if (user) {
        setLoadingOnboarding(true);
        try {
          const isCompleted = await onboardingStorage.isCompleted(user.id);
          // Switch should be ON if tour is NOT completed (should show)
          // Switch should be OFF if tour IS completed (dismissed)
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

  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name || '',
      });
    }
  }, [profile, reset]);

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

  const handleRowClick = (researchId: string, seedKeyword: string) => {
    localStorage.setItem('currentResearchId', researchId);
    localStorage.setItem('keywordAnalyzed', seedKeyword);
    navigate(`/keyword-results?id=${researchId}`);
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>

            {profileLoading ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <Skeleton className="h-10 w-32 mt-4" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center mb-8">
                  <div className="relative">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={profile?.avatar_url || ''} alt="Profile" />
                      <AvatarFallback className="text-2xl">
                        {userInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 rounded-full"
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
                  <p className="text-sm text-muted-foreground mt-2">
                    Click to update your avatar
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/research')}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Tour & Onboarding</h3>
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex-1">
                      <Label htmlFor="show-onboarding" className="text-sm font-normal">
                        Show onboarding tour on next visit
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable this to see the product tour again when you visit the research page
                      </p>
                    </div>
                    <Switch
                      id="show-onboarding"
                      checked={showOnboarding}
                      disabled={loadingOnboarding}
                      onCheckedChange={async (checked) => {
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
                            // Revert on error
                            setShowOnboarding(!checked);
                            toast({
                              title: 'Update failed',
                              description: 'Failed to update onboarding preference',
                              variant: 'destructive',
                            });
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </Card>

          <SubscriptionStatus />
        </div>

        {/* Research History Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Research History</CardTitle>
            <CardDescription>
              Your recent keyword research sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {researchLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : researchHistory && researchHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>API Cost</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {researchHistory.map((item) => (
                    <TableRow 
                      key={item.id}
                      onClick={() => handleRowClick(item.id, item.seed_keyword)}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <TableCell className="font-medium">{item.seed_keyword}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.total_results || 0} results
                        </Badge>
                      </TableCell>
                      <TableCell>{item.location_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.language_code}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.api_cost ? `$${Number(item.api_cost).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No research history yet</p>
                <Button onClick={() => navigate('/research')}>
                  Start Your First Research
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
