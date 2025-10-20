import { test, expect } from '@playwright/test';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';
const D1 = process.env.TEST_DOM1 || 'mountainwarehouse.com';
const D2 = process.env.TEST_DOM2 || 'cotswoldoutdoor.com';

test.describe('Competitor Analyzer - Basic Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('competitor analysis returns gaps and renders table', async ({ page }) => {
    await page.goto('/competitor-analyzer');
    
    // Fill in domains using data-testid
    await page.fill('[data-testid="your-domain-input"]', D1);
    await page.fill('[data-testid="competitor-domain-input"]', D2);
    
    // Click compare button
    await page.click('[data-testid="compare-button"]');
    
    // Wait for API response
    await page.waitForResponse(
      (res) => res.url().includes('/functions/v1/competitor-analyze') && res.status() === 200,
      { timeout: 60000 }
    );
    
    // Verify gap table is visible
    await expect(page.locator('[data-testid="keyword-gap-table"]')).toBeVisible({ timeout: 5000 });
    
    // Verify table has rows
    const rows = page.locator('[data-testid="keyword-gap-table"] tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // Verify key columns exist
    await expect(page.locator('[data-testid="keyword-gap-table"] thead th:has-text("Keyword")')).toBeVisible();
    await expect(page.locator('[data-testid="keyword-gap-table"] thead th:has-text("Competitor Rank")')).toBeVisible();
    await expect(page.locator('[data-testid="keyword-gap-table"] thead th:has-text("Search Volume")')).toBeVisible();
    await expect(page.locator('[data-testid="keyword-gap-table"] thead th:has-text("Ranking URL")')).toBeVisible();
  });
});
