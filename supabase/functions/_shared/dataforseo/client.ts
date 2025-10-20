import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Custom error class for DataForSEO API errors
 */
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
  }
}

export interface DataForSEORequest {
  endpoint: string;
  payload: any;
  module: string;
  userId?: string;
}

export interface DataForSEOResponse<T = any> {
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    cost: number;
    result_count: number;
    path: string[];
    data: any;
    result: T;
  }>;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * BASE_DELAY_MS;
  return exponentialDelay + jitter;
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
async function logUsage(params: {
  userId?: string;
  module: string;
  endpoint: string;
  requestPayload: any;
  responseStatus: number;
  creditsUsed?: number;
  costUsd?: number;
  errorMessage?: string;
}) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found, skipping usage logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase.from('dataforseo_usage').insert({
      user_id: params.userId || null,
      module: params.module,
      endpoint: params.endpoint,
      request_payload: params.requestPayload,
      response_status: params.responseStatus,
      credits_used: params.creditsUsed,
      cost_usd: params.costUsd,
      error_message: params.errorMessage,
    });
  } catch (error) {
    console.error('Failed to log DataForSEO usage:', error);
  }
}

/**
 * Centralized DataForSEO API client with retry logic and usage tracking
 */
export async function callDataForSEO<T = any>(
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
          const delay = getBackoffDelay(attempt);
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
    module: request.module,
    endpoint: request.endpoint,
    requestPayload: request.payload,
    responseStatus: lastStatus || 0,
    errorMessage: lastError?.message || 'Request failed after all retries',
  });

  throw lastError || new DataForSEOError('DataForSEO API request failed after all retries', 500);
}
