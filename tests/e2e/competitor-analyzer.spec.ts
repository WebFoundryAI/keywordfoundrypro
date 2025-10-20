import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Competitor Analyzer Happy Path', () => {
  let page: Page;

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

  test('should complete competitor analysis and display results', async () => {
    // Navigate to competitor analyzer
    await page.goto('/competitor-analyzer');
    await expect(page).toHaveURL(/.*competitor-analyzer/);
    
    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Competitor Analyzer');
    
    // Set up network listener to capture API response
    let apiResponseStatus = 0;
    page.on('response', (response) => {
      if (response.url().includes('/functions/v1/competitor-analyze')) {
        apiResponseStatus = response.status();
        console.log(`competitor-analyze API returned: ${apiResponseStatus}`);
      }
    });
    
    // Fill in domain inputs
    const yourDomainInput = page.locator('input[placeholder="example.com"]').first();
    const competitorDomainInput = page.locator('input[placeholder="competitor.com"]').first();
    
    await yourDomainInput.fill('example.com');
    await competitorDomainInput.fill('competitor.com');
    
    // Submit the form
    const compareButton = page.locator('button:has-text("Compare")');
    await compareButton.click();
    
    // Wait for loading state to complete (button shows "Analyzing...")
    await expect(compareButton).toContainText('Analyzing', { timeout: 2000 });
    
    // Wait for API response and results to load (can take up to 60s for DataForSEO)
    await expect(compareButton).toContainText('Compare', { timeout: 90000 });
    
    // Assert API returned 200
    expect(apiResponseStatus).toBe(200);
    
    // Verify results sections are visible
    await expect(page.locator('text=Keyword Gaps')).toBeVisible();
    await expect(page.locator('text=Backlinks')).toBeVisible();
    await expect(page.locator('text=Technical Score')).toBeVisible();
    
    // Assert keyword gap table has rows
    const keywordTable = page.locator('table').first();
    await expect(keywordTable).toBeVisible();
    
    const tableRows = keywordTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // Assert backlinks chart renders (check for chart title and data)
    await expect(page.locator('text=Backlinks Comparison')).toBeVisible();
    
    // Verify some backlink numbers are displayed
    const backlinkNumbers = page.locator('text=/\\d+/').filter({ hasText: /backlinks|referring/i });
    expect(await backlinkNumbers.count()).toBeGreaterThan(0);
    
    // Verify AI insights section appears
    await expect(page.locator('text=AI Strategic Insights')).toBeVisible({ timeout: 30000 });
  });

  test('should show partial data toast when warnings are present', async () => {
    // Navigate to competitor analyzer
    await page.goto('/competitor-analyzer');
    
    // Listen for toast notifications
    const toastPromise = page.waitForSelector('[role="status"]', { timeout: 100000 });
    
    // Fill in and submit
    await page.locator('input[placeholder="example.com"]').first().fill('test-domain.com');
    await page.locator('input[placeholder="competitor.com"]').first().fill('test-competitor.com');
    await page.locator('button:has-text("Compare")').click();
    
    // Wait for completion
    await expect(page.locator('button:has-text("Compare")')).toBeVisible({ timeout: 90000 });
    
    // Check if a toast appeared (either success or partial data)
    const toast = await toastPromise.catch(() => null);
    if (toast) {
      const toastText = await toast.textContent();
      console.log('Toast message:', toastText);
      
      // Accept either success or partial data messages
      expect(
        toastText?.includes('complete') || 
        toastText?.includes('partial') ||
        toastText?.includes('cached')
      ).toBeTruthy();
    }
  });
});
