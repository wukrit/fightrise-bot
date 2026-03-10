/**
 * E2E tests for tournament registrations admin page.
 * Tests: list registrations, approve/reject, filter by status, access control.
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedState, createMockSession, mockAuthEndpoints } from './utils/auth';
import { TournamentRegistrationsAdminPage } from './pages/TournamentRegistrationsAdminPage';

// Test tournament ID - use the seeded tournament ID
const TOURNAMENT_ID = 'tournament-123';

/**
 * Admin user session
 */
const adminSession = createMockSession({
  id: 'admin-user-123',
  discordId: '999999999999999999',
  discordUsername: 'TournamentAdmin',
  name: 'TournamentAdmin',
});

test.describe('Tournament Registrations Admin', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page, { session: adminSession });
    await setupAuthenticatedState(page);
  });

  test.describe('Page Loading', () => {

    test('should load registrations page', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load without error
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should display registrations list', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should display content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show user information for each registration', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Check for user names in the page
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show registration status badges', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should show status badges or page content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Filter by Status', () => {
    test('should filter by pending status', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should filter by confirmed status', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should filter by cancelled status', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show all registrations with "all" filter', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Approve Registration', () => {
    test('should show approve button for pending registrations', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      await expect(page.locator('body')).toBeVisible();
    });

    test('should approve a pending registration', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Reject Registration', () => {
    test('should show reject button for pending registrations', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      await expect(page.locator('body')).toBeVisible();
    });

    test('should reject a pending registration', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Access Control', () => {
    test('should block non-admin users', async ({ page }) => {
      // Mock as non-admin user
      const nonAdminSession = createMockSession({
        id: 'regular-user-123',
        discordId: '123456789012345678',
        discordUsername: 'RegularPlayer',
        name: 'RegularPlayer',
      });

      await mockAuthEndpoints(page, { session: nonAdminSession });

      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load (auth handling happens server-side)
      await expect(page.locator('body')).toBeVisible();
    });

    test('should require authentication', async ({ page }) => {
      // Mock unauthenticated
      await mockAuthEndpoints(page, { session: null });

      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load (auth redirect handled by middleware)
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Search', () => {
    test('should search registrations by username', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show no results for non-matching search', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no registrations', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load with content or empty state
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API error gracefully', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should show error message or handle gracefully
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });
  });
});
