import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import type {
  DataForSEORequest,
  DataForSEOResponse,
  UsageLogParams,
  RetryAttemptLog,
} from './types.ts';
import { DataForSEOError } from './types.ts';

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Calculate exponential backoff delay with jitter
 * @param attempt - Current retry attempt number (0-indexed)
 * @param retryAfter - Optional Retry-After header value (in seconds)
 * @returns Delay in milliseconds
 */
function getBackoffDelay(attempt: number, retryAfter?: number): number {
  // Honor Retry-After header if present
  if (retryAfter && retryAfter > 0) {
    const retryAfterMs = retryAfter * 1000;
    const jitter = Math.random() * 500; // Small jitter
    return retryAfterMs + jitter;
  }

  // Default exponential backoff with jitter
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * BASE_DELAY_MS;
  return exponentialDelay + jitter;
}

/**
 * Parse Retry-After header value (can be seconds or HTTP date)
 * @param retryAfterHeader - Value from Retry-After header
 * @returns Number of seconds to wait, or undefined
 */
function parseRetryAfter(retryAfterHeader: string | null): number | undefined {
  if (!retryAfterHeader) return undefined;

  // Try parsing as number (seconds)
  const seconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return Math.min(seconds, 60); // Cap at 60 seconds
  }

  // Try parsing as HTTP date
  const retryDate = new Date(retryAfterHeader);
  if (!isNaN(retryDate.getTime())) {
    const secondsUntil = Math.ceil((retryDate.getTime() - Date.now()) / 1000);
    return Math.min(Math.max(secondsUntil, 0), 60); // Between 0 and 60 seconds
  }

  return undefined;
}

/**
 * Check if an HTTP status code should trigger a retry
 */
function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Log API usage to Supabase
 */
async function logUsage(params: UsageLogParams): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[DataForSEO] Supabase credentials not found, skipping usage logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('dataforseo_usage').insert({
      user_id: params.userId || null,
      module: params.module,
      endpoint: params.endpoint,
      request_payload: params.requestPayload,
      response_status: params.responseStatus,
      credits_used: params.creditsUsed,
      cost_usd: params.costUsd,
      error_message: params.errorMessage,
    });

    if (error) {
      console.error('[DataForSEO] Failed to insert usage log:', error);
    }
  } catch (error) {
    console.error('[DataForSEO] Failed to log usage:', error);
  }
}

/**
 * Log retry attempt with structured data
 */
function logRetryAttempt(log: RetryAttemptLog): void {
  console.log(JSON.stringify({
    event: 'dataforseo_retry',
    endpoint: log.endpoint,
    status: log.status,
    attempt: log.attempt,
    delay_ms: log.delay_ms,
    user_id: log.user_id,
    project_id: log.project_id,
    retry_after: log.retry_after,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Centralized DataForSEO API client with retry logic and usage tracking
 */
export async function callDataForSEO<T = unknown>(
  request: DataForSEORequest
): Promise<DataForSEOResponse<T>> {
  const apiLogin = Deno.env.get('DATAFORSEO_LOGIN');
  const apiPassword = Deno.env.get('DATAFORSEO_PASSWORD');

  if (!apiLogin || !apiPassword) {
    throw new Error('DataForSEO credentials not configured');
  }

  const authHeader = `Basic ${btoa(`${apiLogin}:${apiPassword}`)}`;
  const url = `${DATAFORSEO_BASE_URL}${request.endpoint}`;

  let lastError: Error | null = null;
  let lastStatus = 0;
  let lastResponse: DataForSEOResponse<T> | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[DataForSEO] Attempt ${attempt + 1}/${MAX_RETRIES + 1} for ${request.module} - ${request.endpoint}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.payload),
      });

      lastStatus = response.status;
      const data: DataForSEOResponse<T> = await response.json();
      lastResponse = data;

      // Handle 402 (payment required) - DO NOT RETRY
      if (response.status === 402) {
        const errorMsg = 'DataForSEO API credits exhausted. Please add credits to your DataForSEO account.';
        await logUsage({
          userId: request.userId,
          projectId: request.projectId,
          module: request.module,
          endpoint: request.endpoint,
          requestPayload: request.payload,
          responseStatus: response.status,
          errorMessage: errorMsg,
        });
        throw new DataForSEOError(errorMsg, 402);
      }

      // Check if we should retry based on status (429 or 5xx errors)
      if (!response.ok && shouldRetry(response.status)) {
        const errorMsg = `HTTP ${response.status}: ${data.status_message || 'Unknown error'}`;
        lastError = new DataForSEOError(errorMsg, response.status);

        if (attempt < MAX_RETRIES) {
          // Parse Retry-After header if present
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfterSeconds = parseRetryAfter(retryAfterHeader);
          const delay = getBackoffDelay(attempt, retryAfterSeconds);

          // Log retry attempt with structured data
          logRetryAttempt({
            endpoint: request.endpoint,
            status: response.status,
            attempt: attempt + 1,
            delay_ms: Math.round(delay),
            user_id: request.userId,
            project_id: request.projectId,
            retry_after: retryAfterSeconds,
          });

          console.log(`[DataForSEO] Retrying after ${delay}ms due to ${response.status}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // Final attempt failed - will log below
      }

      // Success or non-retryable error - log once and return
      const creditsUsed = data.cost || data.tasks?.[0]?.cost;
      const costUsd = creditsUsed;

      await logUsage({
        userId: request.userId,
        projectId: request.projectId,
        module: request.module,
        endpoint: request.endpoint,
        requestPayload: request.payload,
        responseStatus: response.status,
        creditsUsed,
        costUsd,
        errorMessage: response.ok ? undefined : (data.status_message || 'Request failed'),
      });

      return data;

    } catch (error) {
      // Re-throw DataForSEOError without retrying (credits exhausted)
      if (error instanceof DataForSEOError) {
        throw error;
      }
      
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[DataForSEO] Attempt ${attempt + 1} failed:`, lastError);

      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt);
        console.log(`[DataForSEO] Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted - log final failure once
  await logUsage({
    userId: request.userId,
    projectId: request.projectId,
    module: request.module,
    endpoint: request.endpoint,
    requestPayload: request.payload,
    responseStatus: lastStatus || 0,
    errorMessage: lastError?.message || 'Request failed after all retries',
  });

  throw lastError || new DataForSEOError('DataForSEO API request failed after all retries', 500);
}
