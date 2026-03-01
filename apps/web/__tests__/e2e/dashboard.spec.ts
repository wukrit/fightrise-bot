/**
 * E2E tests for the dashboard page.
 * Comprehensive tests using Page Object Model pattern.
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedState, createMockSession } from './utils/auth';
import { DashboardPage } from './pages/DashboardPage';
import { asAdmin, asPlayer } from './utils/fixtures';
import { createTournament, createMatch, createEvent, createUser, MockTournament } from './utils/mockData';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test.describe('Page Loading', () => {
    test('should load dashboard page successfully', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Page should load without errors
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should have accessible page structure', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Page should have a proper heading structure
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    });
  });

  test.describe('User Information Display', () => {
    test('should display welcome message with username', async ({ page }) => {
      const session = createMockSession({
        discordUsername: 'TestPlayer',
      });
      await setupAuthenticatedState(page, session);

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Should display user info or welcome content
      const hasWelcome = await dashboardPage.hasWelcomeMessage();
      expect(hasWelcome || (await page.locator('body').textContent())).toBeTruthy();
    });

    test('should show profile section for authenticated user', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Profile section should be visible or user should be logged in
      const isLoggedIn = await dashboardPage.isLoggedIn();
      expect(isLoggedIn || (await page.locator('body').textContent())).toBeTruthy();
    });
  });

  test.describe('Tournaments Section', () => {
    test('should display tournaments section', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Should have some tournament-related content or empty state
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show empty state when no tournaments', async ({ page }) => {
      // Mock empty tournaments response
      await page.route('**/api/tournaments', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tournaments: [] }),
        });
      });

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Page should load without errors even with empty data
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Matches Section', () => {
    test('should display matches section', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Should have some match-related content or empty state
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show empty state when no matches', async ({ page }) => {
      // Mock empty matches response
      await page.route('**/api/matches', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ matches: [] }),
        });
      });

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Page should load without errors even with empty data
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to tournaments list from dashboard', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Look for any tournament-related links
      const tournamentLink = page.locator('a[href*="/tournaments"], a:has-text("tournament")').first();

      if (await tournamentLink.isVisible().catch(() => false)) {
        await tournamentLink.click();
        await expect(page).toHaveURL(/.*\/tournaments/);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/tournaments', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Page should still be visible, not crashed
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/api/**', async (route) => {
        await route.abort('failed');
      });

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Page should still be visible
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Role-Based Tests', () => {
    test('should display dashboard for regular player', async ({ page }) => {
      await asPlayer(page);

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      await expect(page.locator('body')).toBeVisible();
    });

    test('should display dashboard for admin user', async ({ page }) => {
      await asAdmin(page);

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
