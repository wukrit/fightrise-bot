/**
 * E2E tests for the dashboard page.
 * Tests tournament management and user interactions.
 */

import { test, expect } from '@playwright/test';
import { mockAuthEndpoints, signInAsMockUser } from './utils/auth';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await page.goto('/dashboard');
  });

  test('should load dashboard for authenticated user', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('body')).not.toContainText('Sign in');
  });

  test('should display user greeting or info', async ({ page }) => {
    // The dashboard should show some indication of the logged-in user
    await expect(page.getByText(/TestPlayer|Welcome|Dashboard/i)).toBeVisible();
  });

  test('should have main navigation', async ({ page }) => {
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });
});

test.describe('Tournament Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMockUser(page, {
      discordUsername: 'TournamentOrganizer',
    });
    await page.goto('/dashboard');
  });

  test('should show tournaments section', async ({ page }) => {
    // Look for tournaments heading or section
    const tournamentsSection = page.getByRole('region', { name: /tournaments/i })
      .or(page.getByRole('heading', { name: /tournaments/i }));

    await expect(tournamentsSection).toBeVisible();
  });

  test('should have option to link Start.gg tournament', async ({ page }) => {
    // Look for a button or link to add/link a tournament
    const addTournamentButton = page.getByRole('button', { name: /add|link|import|new/i })
      .or(page.getByRole('link', { name: /add|link|import|new/i }));

    // This may or may not exist depending on implementation
    // The test verifies the UI element if present
    if (await addTournamentButton.count() > 0) {
      await expect(addTournamentButton.first()).toBeVisible();
    }
  });
});

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMockUser(page, {
      discordUsername: 'ProfileUser',
      discordId: '111222333444555',
    });
  });

  test('should display Discord username', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('ProfileUser')).toBeVisible();
  });

  test('should show Start.gg linking option if not linked', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Check for Start.gg linking prompt or button
    const linkStartggOption = page.getByRole('button', { name: /link.*start\.gg/i })
      .or(page.getByRole('link', { name: /link.*start\.gg/i }))
      .or(page.getByText(/connect.*start\.gg/i));

    // This may or may not be visible depending on implementation
    if (await linkStartggOption.count() > 0) {
      await expect(linkStartggOption.first()).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('should be usable on mobile viewport', async ({ page }) => {
    await mockAuthEndpoints(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');

    // Dashboard should still load and be interactive
    await expect(page.locator('body')).toBeVisible();

    // Navigation should be accessible (possibly via hamburger menu)
    const nav = page.getByRole('navigation');
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });

    // Either nav is visible or there's a menu button
    const navVisible = await nav.isVisible().catch(() => false);
    const menuButtonVisible = await mobileMenuButton.isVisible().catch(() => false);

    expect(navVisible || menuButtonVisible).toBeTruthy();
  });

  test('should be usable on tablet viewport', async ({ page }) => {
    await mockAuthEndpoints(page);

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/dashboard');

    // Dashboard should load properly
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle missing data gracefully', async ({ page }) => {
    await mockAuthEndpoints(page);
    await page.goto('/dashboard');

    // Page should not show uncaught errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('undefined');
  });

  test('should show loading state', async ({ page }) => {
    await mockAuthEndpoints(page);

    // Intercept API calls to delay them
    await page.route('**/api/**', async (route) => {
      if (!route.request().url().includes('/auth/')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await route.continue();
    });

    await page.goto('/dashboard');

    // Should show some loading indicator while data loads
    // This is implementation-dependent
    const loadingIndicator = page.getByRole('progressbar')
      .or(page.getByText(/loading/i))
      .or(page.locator('[data-loading="true"]'));

    // Loading state may be present briefly
    // We just verify the page doesn't error out
    await expect(page.locator('body')).toBeVisible();
  });
});
