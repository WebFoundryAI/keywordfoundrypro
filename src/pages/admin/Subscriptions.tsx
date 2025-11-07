import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Edit, Eye } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string;
  current_period_start: string;
  created_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  profiles: {
    email: string | null;
    display_name: string | null;
    is_admin: boolean | null;
  } | null;
}

interface UserUsage {
  keywords_used: number;
  serp_analyses_used: number;
  related_keywords_used: number;
  period_start: string;
  period_end: string;
}

const AdminSubscriptions = () => {
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [viewingUsage, setViewingUsage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    tier: '',
    status: '',
    trial_ends_at: '',
    current_period_end: ''
  });
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', tierFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_subscriptions')
        .select(`
          *,
          profiles!user_subscriptions_user_id_fkey (
            email,
            display_name,
            is_admin
          )
        `)
        .order('created_at', { ascending: false });

      if (tierFilter !== 'all') {
        query = query.eq('tier', tierFilter as any);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any;
    },
  });

  const { data: userUsage } = useQuery({
    queryKey: ['user-usage', viewingUsage],
    queryFn: async () => {
      if (!viewingUsage) return null;
      
      const { data, error } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', viewingUsage)
        .lte('period_start', new Date().toISOString())
        .gte('period_end', new Date().toISOString())
        .maybeSingle();
      
      if (error) throw error;
      return data as UserUsage | null;
    },
    enabled: !!viewingUsage,
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ subscription, updates }: { subscription: Subscription; updates: any }) => {
      // Update the subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('id', subscription.id);
      
      if (error) throw error;

      // Send notification email
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        
        await supabase.functions.invoke('send-subscription-notification', {
          body: {
            userId: subscription.user_id,
            oldTier: subscription.tier,
            newTier: updates.tier || subscription.tier,
            oldStatus: subscription.status,
            newStatus: updates.status || subscription.status,
            changedBy: currentUser.user?.email || 'Admin'
          }
        });
        
        console.log('Notification email sent successfully');
      } catch (emailError: any) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the whole operation if email fails
        toast.info('Subscription updated, but notification email failed to send');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Subscription updated and user notified');
      setEditingSubscription(null);
    },
    onError: (error: any) => {
      toast.error('Failed to update subscription: ' + error.message);
    },
  });

  const handleEditClick = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditForm({
      tier: subscription.tier,
      status: subscription.status,
      trial_ends_at: subscription.trial_ends_at 
        ? new Date(subscription.trial_ends_at).toISOString().split('T')[0]
        : '',
      current_period_end: new Date(subscription.current_period_end).toISOString().split('T')[0]
    });
  };

  const handleSaveEdit = () => {
    if (!editingSubscription) return;

    const updates: any = {
      tier: editForm.tier,
      status: editForm.status,
      current_period_end: new Date(editForm.current_period_end).toISOString(),
    };

    if (editForm.trial_ends_at) {
      updates.trial_ends_at = new Date(editForm.trial_ends_at).toISOString();
    }

    updateSubscriptionMutation.mutate({
      subscription: editingSubscription,
      updates
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'admin': return 'default';
      case 'enterprise': return 'default';
      case 'professional': return 'secondary';
      case 'starter': return 'outline';
      case 'free_trial': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'canceled': return 'secondary';
      case 'expired': return 'destructive';
      case 'past_due': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">
          View and manage all user subscriptions
        </p>
      </div>

      <div className="flex gap-4">
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free_trial">Free Trial</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Subscriptions</CardTitle>
          <CardDescription>
            Total: {subscriptions?.length || 0} subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Trial Ends</TableHead>
                <TableHead>Period Ends</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions?.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {sub.profiles?.display_name || 'Unknown'}
                        </span>
                        {sub.profiles?.is_admin && (
                          <Badge variant="outline" className="text-xs">Admin</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {sub.profiles?.email || 'No email'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTierBadgeVariant(sub.tier)}>
                      {sub.tier.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(sub.status)}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.stripe_customer_id === 'internal-admin' ? 'outline' : 'secondary'}>
                      {sub.stripe_customer_id === 'internal-admin' ? 'Internal' : 'Stripe'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.trial_ends_at ? (
                      <span className="text-sm">
                        {new Date(sub.trial_ends_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(sub)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingUsage(sub.user_id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editingSubscription} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details for {editingSubscription?.profiles?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          {editingSubscription && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription>
                  {editingSubscription.stripe_customer_id === 'internal-admin' 
                    ? 'This is an internal admin subscription. Changes will not affect Stripe.'
                    : editingSubscription.stripe_subscription_id
                    ? 'Warning: This subscription is managed by Stripe. Manual changes may be overwritten.'
                    : 'This subscription is not linked to Stripe.'}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="tier">Subscription Tier</Label>
                <Select value={editForm.tier} onValueChange={(value) => setEditForm({...editForm, tier: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_trial">Free Trial</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({...editForm, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trial_ends">Trial Ends At (Optional)</Label>
                <Input
                  id="trial_ends"
                  type="date"
                  value={editForm.trial_ends_at}
                  onChange={(e) => setEditForm({...editForm, trial_ends_at: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_end">Current Period Ends</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={editForm.current_period_end}
                  onChange={(e) => setEditForm({...editForm, current_period_end: e.target.value})}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubscription(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateSubscriptionMutation.isPending}>
              {updateSubscriptionMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Usage Dialog */}
      <Dialog open={!!viewingUsage} onOpenChange={(open) => !open && setViewingUsage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Current Usage</DialogTitle>
            <DialogDescription>
              Usage for the current billing period
            </DialogDescription>
          </DialogHeader>
          
          {userUsage ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Keywords Used</Label>
                  <p className="text-2xl font-bold">{userUsage.keywords_used}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">SERP Analyses</Label>
                  <p className="text-2xl font-bold">{userUsage.serp_analyses_used}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Related Keywords</Label>
                  <p className="text-2xl font-bold">{userUsage.related_keywords_used}</p>
                </div>
              </div>
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period Start</span>
                  <span>{new Date(userUsage.period_start).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period End</span>
                  <span>{new Date(userUsage.period_end).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No usage data available for the current period
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingUsage(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
