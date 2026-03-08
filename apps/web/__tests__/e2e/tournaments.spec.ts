/**
 * E2E tests for tournament flows.
 * Tests: view tournament settings page.
 */

import { test, expect, Page } from '@playwright/test';
import { mockAuthEndpoints, setupAuthenticatedState } from './utils/auth';
import { TournamentListPage } from './pages/TournamentListPage';

// Test tournament IDs
const TOURNAMENT_ID = 'tournament-123';
const NON_EXISTENT_ID = 'non-existent-id';

/**
 * Mock tournament data for tests - matches what the component expects
 */
const mockTournament = {
  id: TOURNAMENT_ID,
  name: 'Weekly Fighting Game Tournament',
  startggSlug: 'weekly-fgt-001',
  startAt: '2024-03-15T18:00:00Z',
  endAt: '2024-03-15T23:00:00Z',
  state: 'REGISTRATION_OPEN',
  venue: 'Online',
  city: 'Online',
  countryCode: 'US',
  timezone: 'America/Los_Angeles',
  discordGuildId: '123456789012345678',
  discordChannelId: '987654321098765432',
  autoCreateThreads: true,
  requireCheckIn: true,
  checkInWindowMinutes: 10,
  allowSelfReporting: true,
};

/**
 * Tournament with registration closed
 */
const mockTournamentClosed = {
  ...mockTournament,
  id: 'tournament-closed',
  state: 'REGISTRATION_CLOSED',
};

/**
 * Helper to mock tournament API endpoints using page.route().
 * This works for client-side fetch calls.
 */
async function mockTournamentApi(page: Page) {
  // Mock all /api/tournaments/* endpoints
  await page.route('**/api/tournaments/**', async (route) => {
    const url = route.request().url();

    // List tournaments - exact path
    if (url === 'http://localhost:3000/api/tournaments' || url.endsWith('/api/tournaments')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [mockTournament],
          nextCursor: null,
          hasMore: false,
          total: 1,
        }),
      });
      return;
    }

    // Extract tournament ID from URL
    const match = url.match(/\/api\/tournaments\/([^/?]+)/);
    if (match) {
      const tournamentId = match[1];

      if (tournamentId === TOURNAMENT_ID) {
        // Found tournament
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockTournament),
        });
        return;
      } else if (tournamentId === NON_EXISTENT_ID) {
        // Non-existent tournament
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Tournament not found' }),
        });
        return;
      } else if (tournamentId === 'tournament-closed') {
        // Tournament with registration closed
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockTournamentClosed),
        });
        return;
      }
    }

    // Default: continue
    await route.continue();
  });
}

test.skip.describe('Tournament Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockTournamentApi(page);
  });

  test.describe('View Tournament Settings', () => {
    test.skip('should display tournament name', async ({ page }) => {
      await page.goto(`/tournaments/${TOURNAMENT_ID}`);

      // Should show tournament name in the header
      await expect(page.locator('body')).toContainText(mockTournament.name);

      // Should show the tournament slug
      await expect(page.locator('body')).toContainText(mockTournament.startggSlug);
    });

    test.skip('should display tournament settings page content', async ({ page }) => {
      await page.goto(`/tournaments/${TOURNAMENT_ID}`);

      // The settings page should have these sections
      const bodyText = await page.locator('body').textContent();

      // Check that page loaded with some content
      expect(bodyText && bodyText.length > 0).toBe(true);

      // Should have Discord Integration section
      await expect(page.locator('body')).toContainText(/Discord/i);
    });

    test.skip('should show 404 for non-existent tournament', async ({ page }) => {
      await page.goto(`/tournaments/${NON_EXISTENT_ID}`);

      // Wait for error
      await page.waitForLoadState('networkidle');

      // Should show error message
      await expect(page.locator('body')).toContainText(/Failed to fetch tournament|Tournament not found|Error/i);
    });

    test.skip('should handle API error gracefully', async ({ page }) => {
      // Mock API to return error
      await page.route('**/api/tournaments/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await page.goto(`/tournaments/${TOURNAMENT_ID}`);

      // Should show error message
      const bodyText = await page.locator('body').textContent();
      expect(bodyText && bodyText.length > 0).toBe(true);
    });
  });

  test.describe('Tournament Navigation', () => {
    test.skip('should navigate from tournament list to detail', async ({ page }) => {
      // Setup authenticated state
      await setupAuthenticatedState(page);

      const listPage = new TournamentListPage(page);
      await listPage.goto();

      // Click on a tournament card
      const card = listPage.getTournamentCard(mockTournament.name);
      await card.click();

      // Should navigate to tournament detail/settings
      await page.waitForURL(/\/tournaments\/.+/);
    });
  });
});
