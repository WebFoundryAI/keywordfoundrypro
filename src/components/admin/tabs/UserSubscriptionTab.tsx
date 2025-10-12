import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface UserSubscriptionTabProps {
  user: any;
  onClose: () => void;
}

export function UserSubscriptionTab({ user, onClose }: UserSubscriptionTabProps) {
  const queryClient = useQueryClient();
  const subscription = user.subscription || {};

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      tier: subscription.tier || 'free_trial',
      status: subscription.status || 'active',
      current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start) : new Date(),
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end) : new Date(),
      trial_ends_at: subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null,
    }
  });

  const updateSubscription = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.user_id,
          tier: data.tier,
          status: data.status,
          current_period_start: data.current_period_start?.toISOString(),
          current_period_end: data.current_period_end?.toISOString(),
          trial_ends_at: data.trial_ends_at?.toISOString() || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Subscription updated successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update subscription", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    updateSubscription.mutate(data);
  };

  const watchedValues = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Subscription Tier</Label>
        <Select 
          value={watchedValues.tier} 
          onValueChange={(value) => setValue('tier', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free_trial">Free Trial</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select 
          value={watchedValues.status} 
          onValueChange={(value) => setValue('status', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Current Period Start</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedValues.current_period_start ? format(watchedValues.current_period_start, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={watchedValues.current_period_start}
              onSelect={(date) => setValue('current_period_start', date || new Date())}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Current Period End</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedValues.current_period_end ? format(watchedValues.current_period_end, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={watchedValues.current_period_end}
              onSelect={(date) => setValue('current_period_end', date || new Date())}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Trial Ends At (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedValues.trial_ends_at ? format(watchedValues.trial_ends_at, "PPP") : "No trial"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={watchedValues.trial_ends_at || undefined}
              onSelect={(date) => setValue('trial_ends_at', date || null)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button type="submit" disabled={updateSubscription.isPending} className="w-full">
        {updateSubscription.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
