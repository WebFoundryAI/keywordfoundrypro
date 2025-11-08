import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

const GoogleAdsStatus = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRefresh = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to check status.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-ads-status');

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch status');
      }

      setStatus(data.status);

      toast({
        title: "Status Retrieved",
        description: "Google Ads data status has been updated",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Google Ads Data Status</h1>
        <p className="text-muted-foreground mt-1">
          Check the freshness and availability of Google Ads historical data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Availability</CardTitle>
          <CardDescription>
            View the current status of Google Ads data from DataForSEO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking Status...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </>
            )}
          </Button>

          {status && (
            <div className="grid gap-4 mt-6">
              <Alert>
                <div className="flex items-start gap-3">
                  {status.actual_data ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Actual Data Status</h3>
                    <AlertDescription>
                      {status.actual_data ? (
                        "Real Google Ads data is currently available"
                      ) : (
                        "Google Ads data is currently using estimated/demo values"
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <span className="font-medium">
                      {status.date_update || 'N/A'}
                    </span>
                  </div>
                  
                  {status.last_year_in_monthly_searches && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Year in Monthly Searches</span>
                      <span className="font-medium">
                        {status.last_year_in_monthly_searches}
                      </span>
                    </div>
                  )}
                  
                  {status.last_month_in_monthly_searches && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Month in Monthly Searches</span>
                      <span className="font-medium">
                        {status.last_month_in_monthly_searches}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> Google Ads historical data may have a slight delay.
                  The date of the last update indicates when DataForSEO last refreshed their
                  Google Ads database. Monthly search volume data is typically updated monthly.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!status && !isLoading && (
            <Alert>
              <AlertDescription>
                Click "Refresh Status" to check the current Google Ads data availability
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAdsStatus;
