/**
 * TypeScript types for DataForSEO API interactions
 */

export interface DataForSEORequest {
  endpoint: string;
  payload: unknown;
  module: string;
  userId?: string;
  projectId?: string;
}

export interface DataForSEOTask<T = unknown> {
  id: string;
  status_code: number;
  status_message: string;
  cost: number;
  result_count: number;
  path: string[];
  data: unknown;
  result: Array<T>;
}

export interface DataForSEOResponse<T = unknown> {
  tasks: DataForSEOTask<T>[];
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
}

export interface RetryAttemptLog {
  endpoint: string;
  status: number;
  attempt: number;
  delay_ms: number;
  user_id?: string;
  project_id?: string;
  retry_after?: number;
}

export interface UsageLogParams {
  userId?: string;
  projectId?: string;
  module: string;
  endpoint: string;
  requestPayload: unknown;
  responseStatus: number;
  creditsUsed?: number;
  costUsd?: number;
  errorMessage?: string;
}

export class DataForSEOError extends Error {
  statusCode: number;
  isRateLimit: boolean;
  isCreditsExhausted: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'DataForSEOError';
    this.statusCode = statusCode;
    this.isRateLimit = statusCode === 429;
    this.isCreditsExhausted = statusCode === 402;

    // Maintain proper stack trace (only in V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataForSEOError);
    }
  }
}

export class CreditLimitError extends Error {
  code: string;
  userId: string;
  actionType: string;
  used: number;
  limit: number;

  constructor(message: string, userId: string, actionType: string, used: number, limit: number) {
    super(message);
    this.name = 'CreditLimitError';
    this.code = 'CREDIT_LIMIT';
    this.userId = userId;
    this.actionType = actionType;
    this.used = used;
    this.limit = limit;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CreditLimitError);
    }
  }
}
