import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';
const TEST_DOMAINS = process.env.TEST_DOMAINS; // Format: "yourdomain.com,competitordomain.com"

test.describe('Competitor Analyzer with Custom Parameters', () => {
  let page: Page;

  test.skip(!TEST_DOMAINS, 'TEST_DOMAINS environment variable not set');

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Sign in before each test
    await page.goto('/auth/sign-in');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL(/.*\/app\/keyword-research/, { 
      timeout: 10000,
      waitUntil: 'networkidle'
    });
  });

  test('should analyze with UK location, limit 150, and display all columns', async () => {
    // Parse domains from env
    const [yourDomain, competitorDomain] = (TEST_DOMAINS || 'example.com,competitor.com').split(',');
    
    // Navigate to competitor analyzer
    await page.goto('/competitor-analyzer');
    await expect(page).toHaveURL(/.*competitor-analyzer/);
    
    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Competitor Analyzer');
    
    // Set up network listener to capture API response
    let apiResponseStatus = 0;
    let apiPayload: any = null;
    
    page.on('request', (request) => {
      if (request.url().includes('/functions/v1/competitor-analyze') && request.method() === 'POST') {
        try {
          apiPayload = JSON.parse(request.postData() || '{}');
          console.log('API Request payload:', apiPayload);
        } catch (e) {
          console.error('Failed to parse request payload');
        }
      }
    });
    
    page.on('response', (response) => {
      if (response.url().includes('/functions/v1/competitor-analyze')) {
        apiResponseStatus = response.status();
        console.log(`competitor-analyze API returned: ${apiResponseStatus}`);
      }
    });
    
    // Fill in domain inputs using data-testid
    await page.locator('[data-testid="your-domain-input"]').fill(yourDomain.trim());
    await page.locator('[data-testid="competitor-domain-input"]').fill(competitorDomain.trim());
    
    // Set location code to 2846 (UK)
    await page.locator('[data-testid="location-code-input"]').fill('2846');
    
    // Set language code to 'en'
    await page.locator('[data-testid="language-code-input"]').fill('en');
    
    // Set limit to 150
    await page.locator('[data-testid="limit-input"]').fill('150');
    
    // Submit the form
    const compareButton = page.locator('[data-testid="compare-button"]');
    await compareButton.click();
    
    // Wait for loading state to complete
    await expect(compareButton).toContainText('Analyzing', { timeout: 2000 });
    
    // Wait for results (can take up to 90s for DataForSEO)
    await expect(compareButton).toContainText('Compare', { timeout: 90000 });
    
    // Assert API returned 200
    expect(apiResponseStatus).toBe(200);
    
    // Verify the API payload included our custom parameters
    expect(apiPayload?.location_code).toBe(2846);
    expect(apiPayload?.language_code).toBe('en');
    expect(apiPayload?.limit).toBe(150);
    
    // Assert keyword gap table is visible
    const keywordTable = page.locator('[data-testid="keyword-gap-table"]');
    await expect(keywordTable).toBeVisible();
    
    // Verify table has the expected column headers
    await expect(keywordTable.locator('th:has-text("Keyword")')).toBeVisible();
    await expect(keywordTable.locator('th:has-text("Competitor Rank")')).toBeVisible();
    await expect(keywordTable.locator('th:has-text("Search Volume")')).toBeVisible();
    await expect(keywordTable.locator('th:has-text("Ranking URL")')).toBeVisible();
    
    // Assert table has data rows
    const tableRows = keywordTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // Verify first row has data in all columns
    const firstRow = tableRows.first();
    await expect(firstRow.locator('td').nth(0)).not.toBeEmpty(); // Keyword
    await expect(firstRow.locator('td').nth(1)).not.toBeEmpty(); // Competitor Rank
    await expect(firstRow.locator('td').nth(2)).not.toBeEmpty(); // Search Volume
    // Ranking URL might be empty, so we just check the column exists
    
    // Verify results sections are visible
    await expect(page.locator('[data-testid="keyword-gap-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="backlinks-chart-card"]')).toBeVisible();
    
    console.log(`Test completed successfully with ${rowCount} keyword gap rows`);
  });
});
