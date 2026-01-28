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

    test('should redirect to sign in page when accessing protected route', async ({
      page,
    }) => {
      await page.goto('/dashboard');

      // Should redirect to sign in page
      await expect(page).toHaveURL(/\/auth\/signin|\/api\/auth\/signin/);
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
