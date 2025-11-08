import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface NotificationCounts {
  newResearch: number;
  pendingInvites: number;
  usageAlerts: number;
  adminAlerts: number;
}

export const useNotificationCounts = () => {
  const { user } = useAuth();

  const { data: counts, isLoading } = useQuery({
    queryKey: ['notification-counts', user?.id],
    queryFn: async (): Promise<NotificationCounts> => {
      if (!user) {
        return {
          newResearch: 0,
          pendingInvites: 0,
          usageAlerts: 0,
          adminAlerts: 0,
        };
      }

      let newResearch = 0;

      try {
        // Get new research count (created in last 24 hours)
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: recentResearch } = await supabase
          .from('keyword_research')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', twentyFourHoursAgo.toISOString());

        newResearch = Math.min(recentResearch?.length || 0, 99);
      } catch (error) {
        console.error('Error fetching research count:', error);
      }

      return {
        newResearch,
        pendingInvites: 0, // Reserved for future use
        usageAlerts: 0, // Reserved for future use
        adminAlerts: 0, // Reserved for future use
      };
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    counts: counts || {
      newResearch: 0,
      pendingInvites: 0,
      usageAlerts: 0,
      adminAlerts: 0,
    },
    isLoading,
  };
};
