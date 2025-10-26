/**
 * Mock DataForSEO client for resilience testing
 * Simulates various failure scenarios: 429, 500, 503, Retry-After
 */

export type MockScenario =
  | 'success'
  | 'rate_limit_429'
  | 'server_error_500'
  | 'service_unavailable_503'
  | 'retry_after_60'
  | 'intermittent_failure'
  | 'eventual_success';

export interface MockResponse {
  status: number;
  data?: any;
  headers?: Record<string, string>;
  error?: string;
}

export interface ResilienceTestResult {
  scenario: MockScenario;
  success: boolean;
  attempts: number;
  totalDuration: number;
  errors: string[];
  finalStatus?: number;
}

/**
 * Mock DataForSEO API call with configurable failure scenarios
 */
export async function mockDataForSEOCall(
  scenario: MockScenario,
  attemptCount: number = 0
): Promise<MockResponse> {
  // Simulate network latency
  const delay = Math.random() * 100 + 50; // 50-150ms
  await new Promise((resolve) => setTimeout(resolve, delay));

  switch (scenario) {
    case 'success':
      return {
        status: 200,
        data: {
          status_code: 20000,
          tasks: [
            {
              result: [
                {
                  keyword: 'test keyword',
                  search_volume: 1000,
                  keyword_difficulty: 45,
                },
              ],
            },
          ],
        },
      };

    case 'rate_limit_429':
      return {
        status: 429,
        error: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 60000),
        },
      };

    case 'server_error_500':
      return {
        status: 500,
        error: 'Internal server error',
      };

    case 'service_unavailable_503':
      return {
        status: 503,
        error: 'Service temporarily unavailable',
      };

    case 'retry_after_60':
      return {
        status: 429,
        error: 'Rate limit exceeded',
        headers: {
          'Retry-After': '60', // Retry after 60 seconds
        },
      };

    case 'intermittent_failure':
      // Fails twice, succeeds on third attempt
      if (attemptCount < 2) {
        return {
          status: 503,
          error: 'Service temporarily unavailable',
        };
      }
      return {
        status: 200,
        data: {
          status_code: 20000,
          tasks: [{ result: [{ keyword: 'test', search_volume: 500 }] }],
        },
      };

    case 'eventual_success':
      // Simulates exponential backoff scenario
      if (attemptCount === 0) {
        return { status: 500, error: 'Server error' };
      } else if (attemptCount === 1) {
        return { status: 503, error: 'Service unavailable' };
      } else if (attemptCount === 2) {
        return { status: 200, data: { status_code: 20000, tasks: [] } };
      }
      return { status: 200, data: { status_code: 20000, tasks: [] } };

    default:
      return {
        status: 500,
        error: 'Unknown scenario',
      };
  }
}

/**
 * Simulate retry logic with exponential backoff
 */
export async function testRetryWithBackoff(
  scenario: MockScenario,
  maxAttempts: number = 3
): Promise<ResilienceTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let attempts = 0;
  let lastResponse: MockResponse | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    attempts++;

    try {
      lastResponse = await mockDataForSEOCall(scenario, i);

      // Success
      if (lastResponse.status === 200) {
        return {
          scenario,
          success: true,
          attempts,
          totalDuration: Date.now() - startTime,
          errors,
          finalStatus: 200,
        };
      }

      // Record error
      errors.push(
        `Attempt ${attempts}: ${lastResponse.status} - ${lastResponse.error}`
      );

      // Check for Retry-After header
      if (lastResponse.headers?.['Retry-After']) {
        const retryAfter = parseInt(lastResponse.headers['Retry-After'], 10);
        errors.push(`Retry-After header received: ${retryAfter}s`);
        // In a real implementation, we'd wait this long
        // For testing, we'll just note it
      }

      // Exponential backoff (50ms, 100ms, 200ms for testing speed)
      const backoffDelay = Math.min(50 * Math.pow(2, i), 200);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    } catch (error) {
      errors.push(
        `Attempt ${attempts}: Exception - ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // All attempts exhausted
  return {
    scenario,
    success: false,
    attempts,
    totalDuration: Date.now() - startTime,
    errors,
    finalStatus: lastResponse?.status,
  };
}

/**
 * Test suite runner
 */
export async function runResilienceTests(): Promise<ResilienceTestResult[]> {
  const scenarios: MockScenario[] = [
    'success',
    'rate_limit_429',
    'retry_after_60',
    'server_error_500',
    'service_unavailable_503',
    'intermittent_failure',
    'eventual_success',
  ];

  const results: ResilienceTestResult[] = [];

  for (const scenario of scenarios) {
    const result = await testRetryWithBackoff(scenario, 3);
    results.push(result);
  }

  return results;
}

/**
 * Format results for display
 */
export function formatTestResults(
  results: ResilienceTestResult[]
): Array<{
  scenario: string;
  status: 'PASS' | 'FAIL';
  attempts: number;
  duration: string;
  details: string;
}> {
  return results.map((result) => ({
    scenario: result.scenario,
    status: result.success ? 'PASS' : 'FAIL',
    attempts: result.attempts,
    duration: `${result.totalDuration}ms`,
    details: result.errors.join('; ') || 'No errors',
  }));
}
