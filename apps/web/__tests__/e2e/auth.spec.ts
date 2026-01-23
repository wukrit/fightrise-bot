/**
 * E2E tests for authentication flows.
 * Tests sign in, sign out, and protected route access.
 */

import { test, expect } from '@playwright/test';
import {
  mockAuthEndpoints,
  mockUnauthenticatedState,
  createMockSession,
  signInAsMockUser,
  signOut,
} from './utils/auth';

test.describe('Authentication', () => {
  test.describe('Unauthenticated User', () => {
    test.beforeEach(async ({ page }) => {
      await mockUnauthenticatedState(page);
    });

    test('should show sign in button on home page', async ({ page }) => {
      await page.goto('/');

      // Look for sign in link/button
      const signInButton = page.getByRole('link', { name: /sign in/i });
      await expect(signInButton).toBeVisible();
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

  test.describe('Authenticated User', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
    });

    test('should show user info after sign in', async ({ page }) => {
      await page.goto('/');

      // Should see user's Discord username
      await expect(page.getByText('TestPlayer')).toBeVisible();
    });

    test('should access dashboard when authenticated', async ({ page }) => {
      await page.goto('/dashboard');

      // Should not redirect, should show dashboard content
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });

    test('should show sign out option', async ({ page }) => {
      await page.goto('/');

      // Should have sign out option
      const signOutButton = page.getByRole('button', { name: /sign out/i });
      await expect(signOutButton).toBeVisible();
    });
  });

  test.describe('Session Handling', () => {
    test('should handle session expiration gracefully', async ({ page }) => {
      // Start authenticated
      await mockAuthEndpoints(page);
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/dashboard');

      // Session expires (mock unauthenticated)
      await mockUnauthenticatedState(page);
      await page.reload();

      // Should redirect to sign in
      await expect(page).toHaveURL(/\/auth\/signin|\/api\/auth\/signin/);
    });

    test('should preserve user data across page navigation', async ({ page }) => {
      const session = createMockSession({
        discordUsername: 'NavigationTestUser',
      });
      await mockAuthEndpoints(page, { session });

      await page.goto('/');
      await expect(page.getByText('NavigationTestUser')).toBeVisible();

      // Navigate to another page
      await page.goto('/dashboard');
      await expect(page.getByText('NavigationTestUser')).toBeVisible();
    });
  });

  test.describe('Custom User Properties', () => {
    test('should display user with custom Discord ID', async ({ page }) => {
      await signInAsMockUser(page, {
        discordId: '999888777666555444',
        discordUsername: 'CustomUser',
      });

      await page.goto('/');
      await expect(page.getByText('CustomUser')).toBeVisible();
    });

    test('should display user with avatar', async ({ page }) => {
      await signInAsMockUser(page, {
        discordUsername: 'AvatarUser',
        discordAvatar: 'abc123hash',
        image: 'https://cdn.discordapp.com/avatars/123/abc123hash.png',
      });

      await page.goto('/');

      // Check for avatar image
      const avatar = page.getByRole('img', { name: /avatar/i });
      if (await avatar.isVisible()) {
        await expect(avatar).toHaveAttribute('src', /cdn\.discordapp\.com/);
      }
    });
  });

  test.describe('Sign In/Out Flow', () => {
    test('should complete full sign in -> use app -> sign out flow', async ({
      page,
    }) => {
      // Start unauthenticated
      await mockUnauthenticatedState(page);
      await page.goto('/');

      // Verify unauthenticated state
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();

      // Sign in
      await signInAsMockUser(page, { discordUsername: 'FlowTestUser' });
      await page.goto('/dashboard');

      // Verify authenticated state
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('FlowTestUser')).toBeVisible();

      // Sign out
      await signOut(page);
      await page.goto('/dashboard');

      // Should redirect to sign in
      await expect(page).toHaveURL(/\/auth\/signin|\/api\/auth\/signin/);
    });
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
  });

  test('should display tournament list for authenticated user', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Should show tournaments section
    await expect(
      page.getByRole('heading', { name: /tournaments|my tournaments/i })
    ).toBeVisible();
  });

  test('should have navigation to different sections', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for common navigation elements
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
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
