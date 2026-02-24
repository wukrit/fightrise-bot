/**
 * E2E tests for tournament flows.
 * Tests: view tournament details.
 */

import { test, expect, Page } from '@playwright/test';
import { mockAuthEndpoints } from './utils/auth';

// Test tournament IDs
const TOURNAMENT_ID = 'tournament-123';

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
  events: [
    {
      id: 'event-1',
      name: 'Street Fighter 6',
      gameId: 1,
      startAt: '2024-03-15T19:00:00Z',
    },
    {
      id: 'event-2',
      name: 'Tekken 8',
      gameId: 2,
      startAt: '2024-03-15T20:00:00Z',
    },
  ],
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
    if (url === 'http://localhost:4000/api/tournaments' || url.endsWith('/api/tournaments')) {
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
      } else if (tournamentId === 'non-existent-id') {
        // Non-existent tournament
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Tournament not found' }),
        });
        return;
      }
    }

    // Default: continue
    await route.continue();
  });
}

test.describe('Tournament Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockTournamentApi(page);
  });

  test.describe('View Tournament Details', () => {
    test('should display tournament information', async ({ page }) => {
      await page.goto(`/tournaments/${mockTournament.id}`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show tournament name in the header
      await expect(page.locator('body')).toContainText(mockTournament.name);

      // Should show the tournament slug
      await expect(page.locator('body')).toContainText(mockTournament.startggSlug);

      // Should show registration status
      await expect(page.locator('body')).toContainText(/Registration Open/i);
    });

    test('should show 404 for non-existent tournament', async ({ page }) => {
      await page.goto('/tournaments/non-existent-id');

      // Wait for error
      await page.waitForLoadState('networkidle');

      // Should show error message
      await expect(page.locator('body')).toContainText(/Failed to fetch tournament|Tournament not found/i);
    });
  });
});
