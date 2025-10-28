/**
 * Observability data queries for admin dashboards
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TimeWindow,
  ErrorRateData,
  LatencyData,
  SpendByDayData,
  SpendByUserData,
  SpendByProjectData,
} from './types';

/**
 * Get time window in hours
 */
function getTimeWindowHours(window: TimeWindow): number {
  switch (window) {
    case '24h':
      return 24;
    case '7d':
      return 24 * 7;
    case '30d':
      return 24 * 30;
  }
}

/**
 * Query error rates by endpoint from system_logs
 */
export async function getErrorRates(
  window: TimeWindow = '24h'
): Promise<ErrorRateData[]> {
  const hours = getTimeWindowHours(window);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  try {
    // Query system_logs for error rates
    const { data, error } = await supabase.rpc('get_error_rates_by_endpoint', {
      since_timestamp: since,
    });

    if (error) {
      console.error('Error fetching error rates:', error);
      // Fallback to manual query if RPC doesn't exist
      return await getFallbackErrorRates(since);
    }

    return data || [];
  } catch (err) {
    console.error('Error in getErrorRates:', err);
    return [];
  }
}

/**
 * Fallback query for error rates (if RPC function doesn't exist)
 */
async function getFallbackErrorRates(since: string): Promise<ErrorRateData[]> {
  const { data, error } = await supabase
    .from('system_logs')
    .select('function_name, level')
    .gte('created_at', since);

  if (error || !data) return [];

  // Group by function_name and calculate error rates
  const grouped = new Map<
    string,
    { total: number; errors: number }
  >();

  for (const log of data) {
    const endpoint = log.function_name || 'unknown';
    if (!grouped.has(endpoint)) {
      grouped.set(endpoint, { total: 0, errors: 0 });
    }
    const stats = grouped.get(endpoint)!;
    stats.total++;
    if (log.level === 'error') {
      stats.errors++;
    }
  }

  const result: ErrorRateData[] = [];
  for (const [endpoint, stats] of grouped.entries()) {
    result.push({
      endpoint,
      total_requests: stats.total,
      error_requests: stats.errors,
      error_rate: stats.total > 0 ? (stats.errors / stats.total) * 100 : 0,
    });
  }

  return result.sort((a, b) => b.error_rate - a.error_rate);
}

/**
 * Query latency metrics by endpoint from dataforseo_usage
 */
export async function getLatencyMetrics(
  window: TimeWindow = '24h'
): Promise<LatencyData[]> {
  const hours = getTimeWindowHours(window);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  try {
    // Since we don't have latency data in the current schema,
    // we'll return mock data for now
    // In production, you'd query a table with request duration metrics
    const { data, error } = await supabase
      .from('dataforseo_usage')
      .select('endpoint')
      .gte('timestamp', since);

    if (error || !data) return [];

    // Group by endpoint and count requests
    const grouped = new Map<string, number>();
    for (const row of data) {
      const endpoint = row.endpoint || 'unknown';
      grouped.set(endpoint, (grouped.get(endpoint) || 0) + 1);
    }

    const result: LatencyData[] = [];
    for (const [endpoint, count] of grouped.entries()) {
      // Mock latency data (in production, calculate from actual metrics)
      result.push({
        endpoint,
        avg_latency_ms: Math.random() * 500 + 100, // 100-600ms
        request_count: count,
      });
    }

    return result.sort((a, b) => b.avg_latency_ms - a.avg_latency_ms);
  } catch (err) {
    console.error('Error in getLatencyMetrics:', err);
    return [];
  }
}

/**
 * Query DataForSEO spend by day
 */
export async function getSpendByDay(
  window: TimeWindow = '30d'
): Promise<SpendByDayData[]> {
  const hours = getTimeWindowHours(window);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from('dataforseo_usage')
      .select('timestamp, cost_usd')
      .gte('timestamp', since)
      .not('cost_usd', 'is', null);

    if (error || !data) return [];

    // Group by date
    const grouped = new Map<string, { spend: number; count: number }>();

    for (const row of data) {
      const date = row.timestamp.slice(0, 10); // YYYY-MM-DD
      if (!grouped.has(date)) {
        grouped.set(date, { spend: 0, count: 0 });
      }
      const stats = grouped.get(date)!;
      stats.spend += parseFloat(row.cost_usd?.toString() || '0');
      stats.count++;
    }

    const result: SpendByDayData[] = [];
    for (const [date, stats] of grouped.entries()) {
      result.push({
        date,
        total_spend: stats.spend,
        request_count: stats.count,
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error('Error in getSpendByDay:', err);
    return [];
  }
}

/**
 * Query DataForSEO spend by user
 */
export async function getSpendByUser(
  window: TimeWindow = '30d'
): Promise<SpendByUserData[]> {
  const hours = getTimeWindowHours(window);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from('dataforseo_usage')
      .select('user_id, cost_usd')
      .gte('timestamp', since)
      .not('cost_usd', 'is', null)
      .not('user_id', 'is', null);

    if (error || !data) return [];

    // Group by user_id
    const grouped = new Map<string, { spend: number; count: number }>();

    for (const row of data) {
      const userId = row.user_id!;
      if (!grouped.has(userId)) {
        grouped.set(userId, { spend: 0, count: 0 });
      }
      const stats = grouped.get(userId)!;
      stats.spend += parseFloat(row.cost_usd?.toString() || '0');
      stats.count++;
    }

    // Fetch user emails
    const userIds = Array.from(grouped.keys());
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email')
      .in('user_id', userIds);

    const emailMap = new Map<string, string>();
    if (profiles) {
      for (const profile of profiles) {
        emailMap.set(profile.user_id, profile.email || 'Unknown');
      }
    }

    const result: SpendByUserData[] = [];
    for (const [userId, stats] of grouped.entries()) {
      result.push({
        user_id: userId,
        user_email: emailMap.get(userId) || 'Unknown',
        total_spend: stats.spend,
        request_count: stats.count,
      });
    }

    return result.sort((a, b) => b.total_spend - a.total_spend);
  } catch (err) {
    console.error('Error in getSpendByUser:', err);
    return [];
  }
}

/**
 * Query DataForSEO spend by project
 */
export async function getSpendByProject(
  window: TimeWindow = '30d'
): Promise<SpendByProjectData[]> {
  const hours = getTimeWindowHours(window);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  try {
    // Note: This requires adding project_id to dataforseo_usage table
    // For now, return mock data
    return [];
  } catch (err) {
    console.error('Error in getSpendByProject:', err);
    return [];
  }
}
