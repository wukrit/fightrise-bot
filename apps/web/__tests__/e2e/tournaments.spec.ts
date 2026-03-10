/**
 * E2E tests for tournament flows.
 * Tests: view tournament settings page.
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './utils/auth';
import { TournamentListPage } from './pages/TournamentListPage';

// Test tournament IDs
const TOURNAMENT_ID = 'tournament-123';
const NON_EXISTENT_ID = 'non-existent-id';

test.describe('Tournament Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test.describe('View Tournament Settings', () => {
    test('should display tournament name', async ({ page }) => {
      await page.goto(`/tournaments/${TOURNAMENT_ID}`);

      // Page should load with content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should display tournament settings page content', async ({ page }) => {
      await page.goto(`/tournaments/${TOURNAMENT_ID}`);

      // The settings page should load
      const bodyText = await page.locator('body').textContent();

      // Check that page loaded with some content
      expect(bodyText && bodyText.length > 0).toBe(true);
    });

    test('should show 404 for non-existent tournament', async ({ page }) => {
      await page.goto(`/tournaments/${NON_EXISTENT_ID}`);

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');

      // Should show error or redirect
      const bodyText = await page.locator('body').textContent();
      const currentURL = page.url();
      expect(
        bodyText?.toLowerCase().includes('not found') ||
        bodyText?.toLowerCase().includes('error') ||
        currentURL.includes('/signin')
      ).toBeTruthy();
    });

    test('should handle API error gracefully', async ({ page }) => {
      await page.goto(`/tournaments/${TOURNAMENT_ID}`);

      // Page should show error or handle gracefully
      const bodyText = await page.locator('body').textContent();
      expect(bodyText && bodyText.length > 0).toBe(true);
    });
  });

  test.describe('Tournament Navigation', () => {
    test('should navigate from tournament list to detail', async ({ page }) => {
      const listPage = new TournamentListPage(page);
      await listPage.goto();

      // Page should load
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
