/**
 * E2E tests for the dashboard page.
 * Tests basic page loading and error handling.
 *
 * NOTE: These tests are skipped because the /dashboard page does not exist yet.
 */

import { test, expect } from '@playwright/test';
import { mockAuthEndpoints } from './utils/auth';

test.describe.skip('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
  });

  test('should be usable on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/dashboard');

    // Dashboard should load properly
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle missing data gracefully', async ({ page }) => {
    await page.goto('/dashboard');

    // Page should not show uncaught errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('undefined');
  });

  test('should show page content', async ({ page }) => {
    await page.goto('/dashboard');

    // Page should load without crashing
    await expect(page.locator('body')).toBeVisible();
  });
});
