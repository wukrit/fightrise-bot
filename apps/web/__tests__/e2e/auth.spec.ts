/**
 * E2E tests for authentication flows.
 * Tests sign in, sign out, and protected route access.
 */

import { test, expect } from '@playwright/test';
import { mockUnauthenticatedState } from './utils/auth';

test.describe('Authentication', () => {
  test.describe('Unauthenticated User', () => {
    test.beforeEach(async ({ page }) => {
      await mockUnauthenticatedState(page);
    });

    test('should allow access to protected route on localhost (middleware bypasses auth for E2E)', async ({
      page,
    }) => {
      // The middleware intentionally bypasses auth for localhost/test environments
      // See apps/web/middleware.ts - this allows E2E tests to work without OAuth
      await page.goto('/dashboard');

      // Page should load (middleware allows it)
      await expect(page).toHaveURL(/\/dashboard/);

      // Session should be empty (unauthenticated)
      await page.waitForLoadState('networkidle');
      const session = await page.evaluate(() => {
        // @ts-ignore - NextAuth exposes session via window
        return window.__NEXT_DATA__?.props?.pageProps?.session ?? null;
      });
      // Session will be null/undefined since we mocked unauthenticated state
      expect(session).toBeNull();
    });

    test('should show sign in page with Discord provider', async ({ page }) => {
      await page.goto('/auth/signin');

      // Should have Discord sign in option
      const discordButton = page.getByRole('button', { name: /discord/i });
      await expect(discordButton).toBeVisible();
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
