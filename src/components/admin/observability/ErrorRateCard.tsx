import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ErrorRateData } from '@/lib/observability/types';
import { AlertCircle } from 'lucide-react';

interface ErrorRateCardProps {
  data: ErrorRateData[];
  isLoading?: boolean;
}

export function ErrorRateCard({ data, isLoading }: ErrorRateCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Rate by Endpoint</CardTitle>
          <CardDescription>HTTP error percentage by service endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getErrorBadge = (rate: number) => {
    if (rate === 0) return <Badge variant="outline">0%</Badge>;
    if (rate < 5) return <Badge variant="secondary">{rate.toFixed(1)}%</Badge>;
    if (rate < 10) return <Badge variant="default">{rate.toFixed(1)}%</Badge>;
    return <Badge variant="destructive">{rate.toFixed(1)}%</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Error Rate by Endpoint
        </CardTitle>
        <CardDescription>HTTP error percentage by service endpoint</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No error data available</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Total Requests</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Error Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.endpoint}>
                  <TableCell className="font-mono text-sm">{row.endpoint}</TableCell>
                  <TableCell className="text-right font-mono">{row.total_requests}</TableCell>
                  <TableCell className="text-right font-mono">{row.error_requests}</TableCell>
                  <TableCell className="text-right">{getErrorBadge(row.error_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
