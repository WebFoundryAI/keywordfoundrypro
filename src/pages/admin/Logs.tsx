import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Download, Search, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  function?: string;
  metadata?: Record<string, any>;
}

export default function AdminLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view logs",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Build query params
      const params = new URLSearchParams({
        limit: '1000',
      });

      if (levelFilter && levelFilter !== 'all') {
        params.append('level', levelFilter);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-logs?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setLoading(false);
    } catch (error: any) {
      logger.error('Error fetching logs:', error);
      toast({
        title: "Error fetching logs",
        description: error.message || "Failed to load server logs. Make sure the fetch-logs Edge Function is deployed.",
        variant: "destructive"
      });
      setLogs([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLogs();
      }, 5000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.function?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    
    return matchesSearch && matchesLevel;
  });

  const handleExport = () => {
    const logContent = filteredLogs.map(log => {
      return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.function ? `[${log.function}] ` : ''}${log.message}${log.metadata ? ` ${JSON.stringify(log.metadata)}` : ''}`;
    }).join('\n');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `server-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Logs exported",
      description: `Exported ${filteredLogs.length} log entries`,
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'default';
      case 'info':
        return 'secondary';
      case 'debug':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Server Logs</h1>
        <p className="text-muted-foreground">
          Monitor real-time system events and errors
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Server Logs</CardTitle>
              <CardDescription>
                Last ~1,000 lines • Auto-refresh every 5 seconds
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={autoRefresh ? "default" : "outline"}>
                {autoRefresh ? "Live" : "Paused"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? "Pause" : "Start"} Auto-refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={filteredLogs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Log Level</Label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Log Display */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {filteredLogs.length} of {logs.length} logs</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={scrollToBottom}
              >
                Scroll to bottom
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[600px] w-full border rounded-md" ref={scrollRef}>
                <div className="p-4 font-mono text-sm space-y-1">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No logs found matching your filters</p>
                    </div>
                  ) : (
                    filteredLogs.map((log, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 py-1 px-2 rounded hover:bg-muted/50 ${
                          log.level === 'error' ? 'bg-destructive/10' : ''
                        }`}
                      >
                        <span className="text-muted-foreground whitespace-nowrap text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge
                          variant={getLevelColor(log.level) as any}
                          className="shrink-0 text-xs"
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        {log.function && (
                          <span className="text-primary whitespace-nowrap text-xs">
                            [{log.function}]
                          </span>
                        )}
                        <span className="flex-1 break-all">
                          {log.message}
                          {log.metadata && (
                            <span className="text-muted-foreground ml-2">
                              {JSON.stringify(log.metadata)}
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">About Server Logs</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            Server logs display real-time entries from Edge Functions and system operations stored in the database.
          </p>
          <p className="font-medium text-foreground">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Only custom logs are shown:</strong> Logs must be explicitly written by Edge Functions to the system_logs table</li>
            <li><strong>For full Edge Function logs:</strong> Use Supabase Dashboard → Edge Functions → [function name] → Logs</li>
            <li><strong>Retention:</strong> Logs are automatically deleted after 7 days</li>
            <li><strong>Security:</strong> Only admins can access logs; sensitive data should be masked by Edge Functions</li>
            <li><strong>Performance:</strong> Limit to 1,000 most recent entries</li>
          </ul>
          <p className="font-medium text-foreground mt-4">To Add Logging to Edge Functions:</p>
          <p className="text-xs font-mono bg-muted p-2 rounded mt-2">
            await supabaseClient.from('system_logs').insert({'{'}
            <br />
            &nbsp;&nbsp;level: 'error',
            <br />
            &nbsp;&nbsp;function_name: 'my-function',
            <br />
            &nbsp;&nbsp;message: 'Something went wrong',
            <br />
            &nbsp;&nbsp;metadata: {'{'} error: error.message {'}'},
            <br />
            &nbsp;&nbsp;user_id: user?.id,
            <br />
            &nbsp;&nbsp;request_id: requestId
            <br />
            {'}'});
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
