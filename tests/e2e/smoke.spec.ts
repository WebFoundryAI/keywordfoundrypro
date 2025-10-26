import { test, expect } from '@playwright/test';

// Smoke tests for critical paths
// These ensure basic functionality works without breaking

test.describe('Smoke Tests', () => {
  test.skip('should load dashboard', async ({ page }) => {
    // Skip in CI - requires auth setup
    await page.goto('/');

    // Should see the page title or main heading
    await expect(page).toHaveTitle(/Keyword Foundry Pro/i);
  });

  test.skip('should navigate to projects', async ({ page }) => {
    await page.goto('/');

    // Click projects link
    await page.click('text=Projects');

    // Should navigate to projects page
    await expect(page).toHaveURL(/\/projects/);
  });

  test.skip('should open export menu', async ({ page }) => {
    await page.goto('/projects/test-project');

    // Click export button
    await page.click('button:has-text("Export")');

    // Should see export options
    await expect(page.locator('text=Export as CSV')).toBeVisible();
  });

  test.skip('should apply preset', async ({ page }) => {
    await page.goto('/projects/test-project');

    // Open preset picker
    await page.click('button:has-text("Apply Preset")');

    // Select a preset
    await page.click('text=E-commerce SEO');

    // Filters should be applied
    await expect(page.locator('input[name="minVolume"]')).toHaveValue('100');
  });

  test('basic page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate to a static page (doesn't require auth)
    await page.goto('/');

    // Should not have console errors
    expect(errors).toHaveLength(0);
  });

  test('response time is acceptable', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Should load within 5 seconds (generous for dev)
    expect(responseTime).toBeLessThan(5000);
  });
});

// Performance baseline tests
test.describe('Performance Baselines', () => {
  test('measures TTFB', async ({ page }) => {
    await page.goto('/');

    const ttfb = await page.evaluate(() => {
      const navTiming = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      return navTiming.responseStart - navTiming.requestStart;
    });

    // TTFB should be under 1 second for dev
    expect(ttfb).toBeLessThan(1000);
  });

  test('measures FCP', async ({ page }) => {
    await page.goto('/');

    const fcp = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(
        (entry) => entry.name === 'first-contentful-paint'
      );
      return fcpEntry?.startTime || 0;
    });

    // FCP should be under 2 seconds for dev
    expect(fcp).toBeLessThan(2000);
  });
});
