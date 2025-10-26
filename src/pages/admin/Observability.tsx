import { useState, useEffect } from 'react';
import { ErrorRateCard } from '@/components/admin/observability/ErrorRateCard';
import { LatencyCard } from '@/components/admin/observability/LatencyCard';
import { SpendByDayCard } from '@/components/admin/observability/SpendByDayCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimeWindow, SpendGrouping } from '@/lib/observability/types';
import {
  getErrorRates,
  getLatencyMetrics,
  getSpendByDay,
  getSpendByUser,
} from '@/lib/observability/queries';

export default function Observability() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [spendGrouping, setSpendGrouping] = useState<SpendGrouping>('day');
  const [isLoading, setIsLoading] = useState(true);

  // Data state
  const [errorRates, setErrorRates] = useState<Awaited<ReturnType<typeof getErrorRates>>>([]);
  const [latencies, setLatencies] = useState<Awaited<ReturnType<typeof getLatencyMetrics>>>([]);
  const [spendByDay, setSpendByDay] = useState<Awaited<ReturnType<typeof getSpendByDay>>>([]);
  const [spendByUser, setSpendByUser] = useState<Awaited<ReturnType<typeof getSpendByUser>>>([]);

  useEffect(() => {
    loadData();
  }, [timeWindow]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [errors, latency, daySpend, userSpend] = await Promise.all([
        getErrorRates(timeWindow),
        getLatencyMetrics(timeWindow),
        getSpendByDay(timeWindow),
        getSpendByUser(timeWindow),
      ]);

      setErrorRates(errors);
      setLatencies(latency);
      setSpendByDay(daySpend);
      setSpendByUser(userSpend);
    } catch (error) {
      console.error('Error loading observability data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Observability Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor errors, latency, and DataForSEO spend across the platform
          </p>
        </div>
        <Select value={timeWindow} onValueChange={(value) => setTimeWindow(value as TimeWindow)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dashboard Cards */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorRateCard data={errorRates} isLoading={isLoading} />
          <LatencyCard data={latencies} isLoading={isLoading} />
        </div>

        <SpendByDayCard
          dayData={spendByDay}
          userData={spendByUser}
          grouping={spendGrouping}
          onGroupingChange={setSpendGrouping}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
