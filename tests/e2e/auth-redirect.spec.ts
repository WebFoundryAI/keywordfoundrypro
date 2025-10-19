import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Auth Redirect Flow', () => {
  let page: Page;
  let network404Occurred = false;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    network404Occurred = false;

    // Monitor network for 404 responses
    page.on('response', (response) => {
      if (response.status() === 404) {
        console.error(`404 detected: ${response.url()}`);
        network404Occurred = true;
      }
    });
  });

  test('should redirect to /app/keyword-research after successful login without 404', async () => {
    // Navigate to sign-in page
    await page.goto('/auth/sign-in');
    await expect(page).toHaveURL(/.*auth\/sign-in/);

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/.*\/app\/keyword-research/, { 
      timeout: 10000,
      waitUntil: 'networkidle'
    });

    // Assert final URL
    expect(page.url()).toContain('/app/keyword-research');

    // Assert no 404 occurred during redirect
    expect(network404Occurred).toBe(false);

    // Assert page content loaded (not 404 page)
    await expect(page.locator('h1')).toContainText('Keyword Research');
    
    // Verify no 404 text appears
    await expect(page.locator('text=404')).not.toBeVisible();
    await expect(page.locator('text=Page not found')).not.toBeVisible();
  });

  test('should redirect to /app/keyword-research after OAuth callback without 404', async () => {
    // Simulate direct navigation to callback (as OAuth would)
    await page.goto('/auth/callback');

    // Should not show 404
    await expect(page.locator('text=404')).not.toBeVisible();
    await expect(page.locator('text=Page not found')).not.toBeVisible();

    // Assert no network 404s
    expect(network404Occurred).toBe(false);
  });
});
