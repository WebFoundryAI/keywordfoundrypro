import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { LatencyData } from '@/lib/observability/types';
import { Clock } from 'lucide-react';

interface LatencyCardProps {
  data: LatencyData[];
  isLoading?: boolean;
}

export function LatencyCard({ data, isLoading }: LatencyCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latency by Endpoint</CardTitle>
          <CardDescription>Average response time by service endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getLatencyBadge = (ms: number) => {
    if (ms < 100) return <Badge variant="outline">{ms.toFixed(0)}ms</Badge>;
    if (ms < 500) return <Badge variant="secondary">{ms.toFixed(0)}ms</Badge>;
    if (ms < 1000) return <Badge variant="default">{ms.toFixed(0)}ms</Badge>;
    return <Badge variant="destructive">{ms.toFixed(0)}ms</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Latency by Endpoint
        </CardTitle>
        <CardDescription>Average response time by service endpoint</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No latency data available</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Avg Latency</TableHead>
                {data.some((d) => d.p50_latency_ms) && (
                  <>
                    <TableHead className="text-right">P50</TableHead>
                    <TableHead className="text-right">P95</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.endpoint}>
                  <TableCell className="font-mono text-sm">{row.endpoint}</TableCell>
                  <TableCell className="text-right font-mono">{row.request_count}</TableCell>
                  <TableCell className="text-right">{getLatencyBadge(row.avg_latency_ms)}</TableCell>
                  {row.p50_latency_ms && row.p95_latency_ms && (
                    <>
                      <TableCell className="text-right">
                        <Badge variant="outline">{row.p50_latency_ms.toFixed(0)}ms</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{row.p95_latency_ms.toFixed(0)}ms</Badge>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
