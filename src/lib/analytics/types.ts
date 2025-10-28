export type EventType =
  | 'signup'
  | 'first_query'
  | 'first_export'
  | 'upgrade'
  | 'downgrade'
  | 'churn';

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  event_metadata: Record<string, any> | null;
  created_at: string;
}

export interface FunnelUser {
  user_id: string;
  signup_at: string;
  plan: string;
  is_admin: boolean;
  first_query_at: string | null;
  first_export_at: string | null;
  upgraded_at: string | null;
  hours_to_first_query: number | null;
  hours_to_first_export: number | null;
  hours_to_upgrade: number | null;
  signup_week: string;
  signup_month: string;
}

export interface FunnelCohort {
  signup_week: string;
  plan: string;
  total_signups: number;
  completed_first_query: number;
  completed_first_export: number;
  completed_upgrade: number;
  pct_first_query: number;
  pct_first_export: number;
  pct_upgrade: number;
  avg_hours_to_first_query: number | null;
  avg_hours_to_first_export: number | null;
  avg_hours_to_upgrade: number | null;
}

export interface FunnelSummary {
  plan: string;
  total_users: number;
  users_with_query: number;
  users_with_export: number;
  users_upgraded: number;
  conversion_to_query: number;
  conversion_query_to_export: number;
  conversion_export_to_upgrade: number;
  overall_conversion_to_paid: number;
  median_hours_to_query: number | null;
  median_hours_to_export: number | null;
  median_hours_to_upgrade: number | null;
}

export interface FunnelStageMetrics {
  stage: 'signup' | 'first_query' | 'first_export' | 'upgrade';
  users: number;
  conversion_from_previous: number | null;
  avg_time_from_signup_hours: number | null;
}

export interface SegmentFilter {
  plan?: string;
  startDate?: string;
  endDate?: string;
  cohortWeek?: string;
  cohortMonth?: string;
}

export interface TimeSeriesPoint {
  date: string;
  signups: number;
  first_queries: number;
  first_exports: number;
  upgrades: number;
}

export interface ConversionRates {
  signup_to_query: number;
  query_to_export: number;
  export_to_upgrade: number;
  signup_to_upgrade: number;
}

export interface FunnelMetrics {
  stages: FunnelStageMetrics[];
  conversion_rates: ConversionRates;
  time_to_convert: {
    median_hours_to_query: number | null;
    median_hours_to_export: number | null;
    median_hours_to_upgrade: number | null;
  };
  total_users: number;
}
