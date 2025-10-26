import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SpendByDayData, SpendByUserData, SpendGrouping } from '@/lib/observability/types';
import { DollarSign } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SpendByDayCardProps {
  dayData: SpendByDayData[];
  userData: SpendByUserData[];
  grouping: SpendGrouping;
  onGroupingChange: (grouping: SpendGrouping) => void;
  isLoading?: boolean;
}

export function SpendByDayCard({
  dayData,
  userData,
  grouping,
  onGroupingChange,
  isLoading,
}: SpendByDayCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>DataForSEO Spend</CardTitle>
          <CardDescription>API usage costs breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const totalSpend =
    grouping === 'day'
      ? dayData.reduce((sum, row) => sum + row.total_spend, 0)
      : userData.reduce((sum, row) => sum + row.total_spend, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              DataForSEO Spend
            </CardTitle>
            <CardDescription>
              API usage costs breakdown - Total: {formatCurrency(totalSpend)}
            </CardDescription>
          </div>
          <Select value={grouping} onValueChange={(value) => onGroupingChange(value as SpendGrouping)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">By Day</SelectItem>
              <SelectItem value="user">By User</SelectItem>
              <SelectItem value="project">By Project</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {grouping === 'day' && (
          <>
            {dayData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No spend data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayData.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="font-mono text-sm">{row.date}</TableCell>
                      <TableCell className="text-right font-mono">{row.request_count}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.total_spend)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}

        {grouping === 'user' && (
          <>
            {userData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No user spend data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userData.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="text-sm">{row.user_email}</TableCell>
                      <TableCell className="text-right font-mono">{row.request_count}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.total_spend)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}

        {grouping === 'project' && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Project-level spend tracking coming soon</p>
            <p className="text-sm mt-2">Requires project_id in dataforseo_usage table</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
