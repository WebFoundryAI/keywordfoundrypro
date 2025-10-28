/**
 * Types for observability dashboards
 */

export type TimeWindow = '24h' | '7d' | '30d';

export interface ErrorRateData {
  endpoint: string;
  total_requests: number;
  error_requests: number;
  error_rate: number; // 0-100 percentage
}

export interface LatencyData {
  endpoint: string;
  avg_latency_ms: number;
  p50_latency_ms?: number;
  p95_latency_ms?: number;
  request_count: number;
}

export interface SpendByDayData {
  date: string; // YYYY-MM-DD
  total_spend: number;
  request_count: number;
}

export interface SpendByUserData {
  user_id: string;
  user_email: string;
  total_spend: number;
  request_count: number;
}

export interface SpendByProjectData {
  project_id: string;
  project_name: string;
  total_spend: number;
  request_count: number;
}

export type SpendGrouping = 'day' | 'user' | 'project';

export interface ObservabilityMetrics {
  error_rates: ErrorRateData[];
  latencies: LatencyData[];
  spend_by_day: SpendByDayData[];
  spend_by_user: SpendByUserData[];
  spend_by_project: SpendByProjectData[];
}
