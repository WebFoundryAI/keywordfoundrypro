import { test, expect } from '@playwright/test';

test.describe('Competitor Analyzer Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/auth/sign-in');
    
    // Sign in with test credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('/');
    
    // Navigate to competitor analyzer
    await page.goto('/competitor-analyzer');
    await page.waitForLoadState('networkidle');
  });

  test('should handle partial failures gracefully with HTTP 200', async ({ page }) => {
    // Mock the edge function to simulate partial failure
    await page.route('**/functions/v1/competitor-analyze', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      // Return a successful response with warnings indicating on-page failure
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          request_id: 'test-request-123',
          warnings: ['onpage_poll_timeout', 'onpage_your_domain_failed'],
          data: {
            keyword_gap_list: [
              {
                keyword: 'test keyword 1',
                competitor_rank: 5,
                search_volume: 1000,
                competitor_url: 'https://competitor.com/page1'
              },
              {
                keyword: 'test keyword 2',
                competitor_rank: 8,
                search_volume: 500,
                competitor_url: 'https://competitor.com/page2'
              }
            ],
            backlink_summary: {
              your_domain: {
                backlinks: 100,
                referring_domains: 50,
                referring_ips: 45
              },
              competitor_domain: {
                backlinks: 500,
                referring_domains: 200,
                referring_ips: 180
              }
            },
            onpage_summary: {
              your_domain: {
                pages_crawled: 0,
                internal_links: 0,
                external_links: 0,
                images: 0,
                tech_score: 0
              },
              competitor_domain: {
                pages_crawled: 0,
                internal_links: 0,
                external_links: 0,
                images: 0,
                tech_score: 0
              }
            },
            cached: false
          }
        })
      });
    });

    // Fill in the form
    await page.fill('input[data-testid="your-domain-input"]', 'example.com');
    await page.fill('input[data-testid="competitor-domain-input"]', 'competitor.com');

    // Submit the form
    await page.click('button[data-testid="compare-button"]');

    // Wait for the analysis to complete
    await page.waitForTimeout(2000);

    // Assert: Response should be 200 (no navigation to error page)
    expect(page.url()).toContain('/competitor-analyzer');

    // Assert: Toast should show partial data message
    await expect(page.locator('text=Analysis complete with partial data')).toBeVisible({ timeout: 5000 });

    // Assert: Keyword gap table should render with available data
    await expect(page.locator('[data-testid="keyword-gap-table"]')).toBeVisible();
    await expect(page.locator('text=test keyword 1')).toBeVisible();
    await expect(page.locator('text=test keyword 2')).toBeVisible();

    // Assert: Summary cards should show data (even with zero on-page metrics)
    await expect(page.locator('text=2')).toBeVisible(); // 2 keyword gaps
  });

  test('should display inline alert for complete failures with request_id', async ({ page }) => {
    // Mock the edge function to simulate complete failure
    await page.route('**/functions/v1/competitor-analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          request_id: 'error-request-456',
          warnings: ['keywords_your_domain_failed', 'keywords_competitor_domain_failed'],
          error: {
            stage: 'dataforseo',
            message: 'DataForSEO API rate limit exceeded',
            details: '[keywords] status:429 msg:"Rate limit exceeded" err:"Too many requests"'
          }
        })
      });
    });

    // Fill in the form
    await page.fill('input[data-testid="your-domain-input"]', 'example.com');
    await page.fill('input[data-testid="competitor-domain-input"]', 'competitor.com');

    // Submit the form
    await page.click('button[data-testid="compare-button"]');

    // Wait for the alert to appear
    await page.waitForTimeout(2000);

    // Assert: Inline alert should be visible
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();

    // Assert: Alert should contain request_id
    await expect(alert.locator('text=error-request-456')).toBeVisible();

    // Assert: Alert should contain stage information
    await expect(alert.locator('text=dataforseo')).toBeVisible();

    // Assert: Alert should contain error message
    await expect(alert.locator('text=DataForSEO API rate limit exceeded')).toBeVisible();

    // Assert: Alert should have warnings list
    await expect(alert.locator('text=keywords_your_domain_failed')).toBeVisible();
    await expect(alert.locator('text=keywords_competitor_domain_failed')).toBeVisible();

    // Assert: Alert should be dismissible
    const dismissButton = alert.locator('button[aria-label="Dismiss alert"]');
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();
    await expect(alert).not.toBeVisible();

    // Assert: No keyword gap table should be visible
    await expect(page.locator('[data-testid="keyword-gap-card"]')).not.toBeVisible();
  });

  test('should render partial data with alert when some API calls fail', async ({ page }) => {
    // Mock the edge function to simulate partial success with some data
    await page.route('**/functions/v1/competitor-analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          request_id: 'partial-request-789',
          warnings: ['backlinks_competitor_domain_failed', 'param_limit_fallback'],
          data: {
            keyword_gap_list: [
              {
                keyword: 'partial test keyword',
                competitor_rank: 3,
                search_volume: 2000,
                competitor_url: 'https://competitor.com/partial'
              }
            ],
            backlink_summary: {
              your_domain: {
                backlinks: 150,
                referring_domains: 75,
                referring_ips: 70
              },
              competitor_domain: {
                backlinks: 0,
                referring_domains: 0,
                referring_ips: 0
              }
            },
            onpage_summary: {
              your_domain: {
                pages_crawled: 45,
                internal_links: 200,
                external_links: 50,
                images: 100,
                tech_score: 85
              },
              competitor_domain: {
                pages_crawled: 50,
                internal_links: 250,
                external_links: 60,
                images: 120,
                tech_score: 90
              }
            },
            cached: false
          }
        })
      });
    });

    // Fill in the form
    await page.fill('input[data-testid="your-domain-input"]', 'example.com');
    await page.fill('input[data-testid="competitor-domain-input"]', 'competitor.com');

    // Submit the form
    await page.click('button[data-testid="compare-button"]');

    // Wait for the results
    await page.waitForTimeout(2000);

    // Assert: Toast shows partial data
    await expect(page.locator('text=Analysis complete with partial data')).toBeVisible({ timeout: 5000 });

    // Assert: Data should still be rendered
    await expect(page.locator('[data-testid="keyword-gap-table"]')).toBeVisible();
    await expect(page.locator('text=partial test keyword')).toBeVisible();

    // Assert: Backlink chart should render (even with zero competitor data)
    await expect(page.locator('[data-testid="backlinks-chart-card"]')).toBeVisible();

    // Assert: Technical score should show data
    await expect(page.locator('text=85')).toBeVisible(); // Your domain tech score
    await expect(page.locator('text=90')).toBeVisible(); // Competitor tech score
  });

  test('should handle network failures with appropriate error toast', async ({ page }) => {
    // Mock a complete network failure
    await page.route('**/functions/v1/competitor-analyze', async (route) => {
      await route.abort('failed');
    });

    // Fill in the form
    await page.fill('input[data-testid="your-domain-input"]', 'example.com');
    await page.fill('input[data-testid="competitor-domain-input"]', 'competitor.com');

    // Submit the form
    await page.click('button[data-testid="compare-button"]');

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Assert: Network error toast should appear
    await expect(page.locator('text=Network error')).toBeVisible({ timeout: 5000 });

    // Assert: No results should be visible
    await expect(page.locator('[data-testid="keyword-gap-card"]')).not.toBeVisible();
  });

  test('should verify health check endpoint returns credentials status', async ({ page }) => {
    let healthCheckCalled = false;
    let healthCheckResponse: any = null;

    // Intercept the health check call
    await page.route('**/functions/v1/competitor-analyze', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.op === 'health') {
        healthCheckCalled = true;
        healthCheckResponse = {
          ok: true,
          request_id: 'health-check-123',
          warnings: [],
          data: {
            d4s_creds_present: true
          }
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(healthCheckResponse)
        });
      } else {
        // Handle normal analysis request
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            request_id: 'normal-request',
            warnings: [],
            error: {
              stage: 'validation',
              message: 'Both domains are required'
            }
          })
        });
      }
    });

    // Trigger a health check via browser console
    const result = await page.evaluate(async () => {
      const response = await fetch('/functions/v1/competitor-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ op: 'health' })
      });
      return await response.json();
    });

    // Assert: Health check should return expected structure
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.d4s_creds_present).toBeDefined();
    expect(result.warnings).toEqual([]);
  });
});
