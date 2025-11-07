import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

interface TriggerStatus {
  trigger_name: string;
  table_schema: string;
  table_name: string;
  trigger_exists: boolean;
  status: 'OK' | 'MISSING';
}

interface TriggerCheckResponse {
  success: boolean;
  triggers: TriggerStatus[];
  missing_count: number;
  alert: string;
  missing_triggers: TriggerStatus[];
}

export const TriggerHealthMonitor = () => {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);

  const { data: triggerStatus, isLoading } = useQuery({
    queryKey: ['trigger-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_critical_triggers');
      if (error) throw error;
      return data as TriggerStatus[];
    },
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });

  const checkTriggersMutation = useMutation({
    mutationFn: async () => {
      setIsChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('check-triggers', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data as TriggerCheckResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trigger-health'] });
      if (data.missing_count > 0) {
        toast.error(data.alert);
      } else {
        toast.success(data.alert);
      }
      setIsChecking(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to check triggers: ${error.message}`);
      setIsChecking(false);
    },
  });

  const missingTriggers = triggerStatus?.filter(t => t.status === 'MISSING') || [];
  const hasMissingTriggers = missingTriggers.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Database Trigger Health</CardTitle>
            <CardDescription>
              Monitor critical authentication triggers
            </CardDescription>
          </div>
          <Button
            onClick={() => checkTriggersMutation.mutate()}
            disabled={isChecking || isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Check Now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasMissingTriggers && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Critical Issue Detected</AlertTitle>
            <AlertDescription>
              {missingTriggers.length} trigger(s) are missing. User signup may not work correctly.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading trigger status...</div>
        ) : (
          <div className="space-y-2">
            {triggerStatus?.map((trigger) => (
              <div
                key={`${trigger.table_schema}.${trigger.table_name}.${trigger.trigger_name}`}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{trigger.trigger_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {trigger.table_schema}.{trigger.table_name}
                  </div>
                </div>
                <Badge
                  variant={trigger.status === 'OK' ? 'default' : 'destructive'}
                  className="ml-2"
                >
                  {trigger.status === 'OK' ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {trigger.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {hasMissingTriggers && (
          <Alert>
            <AlertDescription>
              To restore missing triggers, run the migration to recreate them from the admin dashboard.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
