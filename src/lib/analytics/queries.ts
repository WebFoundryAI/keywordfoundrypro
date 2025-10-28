import { createClient } from '@/lib/supabase/client';
import type {
  AnalyticsEvent,
  FunnelUser,
  FunnelCohort,
  FunnelSummary,
  FunnelMetrics,
  SegmentFilter,
  TimeSeriesPoint,
  EventType,
} from './types';

/**
 * Track an analytics event
 */
export async function trackEvent(
  userId: string,
  eventType: EventType,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase.from('analytics_events').insert({
    user_id: userId,
    event_type: eventType,
    event_metadata: metadata || null,
  });

  if (error) {
    console.error('Error tracking event:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get funnel users from materialized view
 */
export async function getFunnelUsers(
  filter?: SegmentFilter
): Promise<FunnelUser[]> {
  const supabase = createClient();

  let query = supabase.from('analytics_funnel_view').select('*');

  // Apply filters
  if (filter?.plan) {
    query = query.eq('plan', filter.plan);
  }

  if (filter?.startDate) {
    query = query.gte('signup_at', filter.startDate);
  }

  if (filter?.endDate) {
    query = query.lte('signup_at', filter.endDate);
  }

  if (filter?.cohortWeek) {
    query = query.eq('signup_week', filter.cohortWeek);
  }

  if (filter?.cohortMonth) {
    query = query.eq('signup_month', filter.cohortMonth);
  }

  query = query.order('signup_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching funnel users:', error);
    return [];
  }

  return data || [];
}

/**
 * Get funnel cohorts (weekly breakdown)
 */
export async function getFunnelCohorts(
  filter?: SegmentFilter
): Promise<FunnelCohort[]> {
  const supabase = createClient();

  let query = supabase.from('analytics_funnel_cohorts').select('*');

  if (filter?.plan) {
    query = query.eq('plan', filter.plan);
  }

  if (filter?.startDate) {
    query = query.gte('signup_week', filter.startDate);
  }

  if (filter?.endDate) {
    query = query.lte('signup_week', filter.endDate);
  }

  query = query.order('signup_week', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching funnel cohorts:', error);
    return [];
  }

  return data || [];
}

/**
 * Get funnel summary (overall metrics by plan)
 */
export async function getFunnelSummary(): Promise<FunnelSummary[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('analytics_funnel_summary')
    .select('*')
    .order('plan', { ascending: true });

  if (error) {
    console.error('Error fetching funnel summary:', error);
    return [];
  }

  return data || [];
}

/**
 * Get funnel metrics (for visualization)
 */
export async function getFunnelMetrics(
  filter?: SegmentFilter
): Promise<FunnelMetrics> {
  const users = await getFunnelUsers(filter);

  const totalSignups = users.length;
  const withQuery = users.filter((u) => u.first_query_at).length;
  const withExport = users.filter((u) => u.first_export_at).length;
  const withUpgrade = users.filter((u) => u.upgraded_at).length;

  // Calculate conversion rates
  const signupToQuery = totalSignups > 0 ? (withQuery / totalSignups) * 100 : 0;
  const queryToExport = withQuery > 0 ? (withExport / withQuery) * 100 : 0;
  const exportToUpgrade = withExport > 0 ? (withUpgrade / withExport) * 100 : 0;
  const signupToUpgrade = totalSignups > 0 ? (withUpgrade / totalSignups) * 100 : 0;

  // Calculate median time to convert
  const hoursToQuery = users
    .map((u) => u.hours_to_first_query)
    .filter((h): h is number => h !== null)
    .sort((a, b) => a - b);

  const hoursToExport = users
    .map((u) => u.hours_to_first_export)
    .filter((h): h is number => h !== null)
    .sort((a, b) => a - b);

  const hoursToUpgrade = users
    .map((u) => u.hours_to_upgrade)
    .filter((h): h is number => h !== null)
    .sort((a, b) => a - b);

  const median = (arr: number[]) =>
    arr.length > 0 ? arr[Math.floor(arr.length / 2)] : null;

  return {
    stages: [
      {
        stage: 'signup',
        users: totalSignups,
        conversion_from_previous: null,
        avg_time_from_signup_hours: null,
      },
      {
        stage: 'first_query',
        users: withQuery,
        conversion_from_previous: signupToQuery,
        avg_time_from_signup_hours: median(hoursToQuery),
      },
      {
        stage: 'first_export',
        users: withExport,
        conversion_from_previous: queryToExport,
        avg_time_from_signup_hours: median(hoursToExport),
      },
      {
        stage: 'upgrade',
        users: withUpgrade,
        conversion_from_previous: exportToUpgrade,
        avg_time_from_signup_hours: median(hoursToUpgrade),
      },
    ],
    conversion_rates: {
      signup_to_query: signupToQuery,
      query_to_export: queryToExport,
      export_to_upgrade: exportToUpgrade,
      signup_to_upgrade: signupToUpgrade,
    },
    time_to_convert: {
      median_hours_to_query: median(hoursToQuery),
      median_hours_to_export: median(hoursToExport),
      median_hours_to_upgrade: median(hoursToUpgrade),
    },
    total_users: totalSignups,
  };
}

/**
 * Get time series data for charts
 */
export async function getTimeSeriesData(
  startDate: string,
  endDate: string,
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<TimeSeriesPoint[]> {
  const supabase = createClient();

  // This would need a custom SQL query for optimal performance
  // For MVP, we'll fetch and group in JS
  const users = await getFunnelUsers({ startDate, endDate });

  const groupedData = new Map<string, TimeSeriesPoint>();

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (granularity === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().split('T')[0];
    } else if (granularity === 'month') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return date.split('T')[0]; // day
  };

  users.forEach((user) => {
    const signupDate = formatDate(user.signup_at);

    if (!groupedData.has(signupDate)) {
      groupedData.set(signupDate, {
        date: signupDate,
        signups: 0,
        first_queries: 0,
        first_exports: 0,
        upgrades: 0,
      });
    }

    const point = groupedData.get(signupDate)!;
    point.signups++;

    if (user.first_query_at) point.first_queries++;
    if (user.first_export_at) point.first_exports++;
    if (user.upgraded_at) point.upgrades++;
  });

  return Array.from(groupedData.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * Refresh the materialized view
 * Should be called periodically (e.g., daily via cron)
 */
export async function refreshFunnelView(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClient();

  const { error } = await supabase.rpc('refresh_analytics_funnel_view');

  if (error) {
    console.error('Error refreshing funnel view:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get recent analytics events
 */
export async function getRecentEvents(
  limit: number = 100
): Promise<AnalyticsEvent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent events:', error);
    return [];
  }

  return data || [];
}

/**
 * Get events for a specific user
 */
export async function getUserEvents(userId: string): Promise<AnalyticsEvent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user events:', error);
    return [];
  }

  return data || [];
}
