import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";
import { logger } from '@/lib/logger';

interface ModuleUsage {
  module: string;
  total_credits: number;
  request_count: number;
  avg_credits: number;
}

const Usage = () => {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<ModuleUsage[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodayUsage();
  }, []);

  const fetchTodayUsage = async () => {
    setLoading(true);
    try {
      // Get today's date range (start of day to now)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Query usage grouped by module for today
      const { data, error } = await supabase
        .from('dataforseo_usage')
        .select('module, credits_used, cost_usd')
        .gte('timestamp', todayISO)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Group by module and calculate totals
      const groupedData: Record<string, ModuleUsage> = {};
      
      data?.forEach((record) => {
        const module = record.module || 'unknown';
        if (!groupedData[module]) {
          groupedData[module] = {
            module,
            total_credits: 0,
            request_count: 0,
            avg_credits: 0
          };
        }
        
        groupedData[module].total_credits += record.credits_used || 0;
        groupedData[module].request_count += 1;
      });

      // Calculate averages and sort by total credits
      const usageArray = Object.values(groupedData).map(item => ({
        ...item,
        avg_credits: item.request_count > 0 ? item.total_credits / item.request_count : 0
      })).sort((a, b) => b.total_credits - a.total_credits);

      // Calculate total
      const total = usageArray.reduce((sum, item) => sum + item.total_credits, 0);

      setUsageData(usageArray);
      setTotalCredits(total);
    } catch (error) {
      logger.error('Error fetching usage data:', error);
      toast({
        title: "Error",
        description: "Failed to load usage data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCredits = (credits: number) => {
    return credits.toFixed(6);
  };

  const getModuleBadgeVariant = (module: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      'keyword-research': 'default',
      'serp-analysis': 'secondary',
      'related-keywords': 'outline',
      'competitor-analyze': 'default',
      'keyword-suggestions': 'secondary'
    };
    return variants[module] || 'outline';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading usage data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DataForSEO Usage</h1>
          <p className="text-muted-foreground mt-1">
            Today's API credits consumption by module
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Credits Used Today</CardTitle>
          <CardDescription>
            Across all modules and endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {formatCredits(totalCredits)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {usageData.reduce((sum, item) => sum + item.request_count, 0)} total requests
          </p>
        </CardContent>
      </Card>

      {/* Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Module</CardTitle>
          <CardDescription>
            Breakdown of credits consumed per module
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No API usage recorded today.</p>
              <p className="text-sm mt-2">Usage data will appear here as requests are made.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Total Credits</TableHead>
                  <TableHead className="text-right">Avg Credits/Request</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageData.map((item) => {
                  const percentage = totalCredits > 0 
                    ? (item.total_credits / totalCredits * 100).toFixed(1)
                    : '0.0';
                  
                  return (
                    <TableRow key={item.module}>
                      <TableCell>
                        <Badge variant={getModuleBadgeVariant(item.module)}>
                          {item.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.request_count}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCredits(item.total_credits)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCredits(item.avg_credits)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {percentage}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Usage;
