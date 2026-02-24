/**
 * E2E tests for authentication flows.
 * Tests sign in, sign out, and protected route access.
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedState, mockUnauthenticatedState } from './utils/auth';

test.describe('Authentication', () => {
  test.describe('Authenticated User', () => {
    test.beforeEach(async ({ page }) => {
      // Set session cookie for middleware AND mock API endpoints for client-side
      await setupAuthenticatedState(page);
    });

    test('should access protected route with mocked session', async ({ page }) => {
      await page.goto('/dashboard');

      // Page should load with mocked session
      await expect(page).toHaveURL(/\/dashboard/);

      // Page should be visible
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Unauthenticated User', () => {
    test.beforeEach(async ({ page }) => {
      await mockUnauthenticatedState(page);
    });

    test('should show sign in page with Discord provider', async ({ page }) => {
      await page.goto('/auth/signin');

      // Should have Discord sign in option
      const discordButton = page.getByRole('button', { name: /discord/i });
      await expect(discordButton).toBeVisible();
    });

    test('should redirect to sign in when accessing protected route without session', async ({
      page,
    }) => {
      // Try to access protected route without authentication
      await page.goto('/dashboard');

      // Should be redirected to sign in page
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });
});

test.describe('Health Check', () => {
  test('API health endpoint returns OK', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
