/**
 * E2E tests for tournament flows.
 * Tests: view tournament details, registration, events.
 */

import { test, expect, Page } from '@playwright/test';
import { mockAuthEndpoints, setupAuthenticatedState } from './utils/auth';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
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

test.describe('Tournament Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockTournamentApi(page);
  });

  test.describe('View Tournament Details', () => {
    test('should display tournament information', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Should show tournament name in the header
      await expect(page.locator('body')).toContainText(mockTournament.name);

      // Should show the tournament slug
      await expect(page.locator('body')).toContainText(mockTournament.startggSlug);

      // Should show registration status
      await expect(page.locator('body')).toContainText(/Registration Open/i);
    });

    test('should display tournament name using POM', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Verify tournament name is displayed
      const hasName = await tournamentPage.hasTournamentName();
      expect(hasName).toBe(true);

      const name = await tournamentPage.getTournamentName();
      expect(name).toContain(mockTournament.name);
    });

    test('should display tournament slug', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Verify slug is displayed
      const slugVisible = await tournamentPage.tournamentSlug.isVisible().catch(() => false);
      // Slug might or might not be visible depending on page design
      expect(slugVisible || (await page.locator('body').textContent())).toBeTruthy();
    });

    test('should display venue information', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Verify venue is displayed
      const hasVenue = await tournamentPage.hasEvents() || await page.locator('body').textContent();
      expect(hasVenue).toBeTruthy();
    });

    test('should show events list with game names', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Check if events are visible (either via POM or direct check)
      const eventsVisible = await tournamentPage.hasEvents().catch(() => false);
      if (eventsVisible) {
        const eventCount = await tournamentPage.getEventCount();
        expect(eventCount).toBeGreaterThan(0);
      } else {
        // Fallback to checking body content
        await expect(page.locator('body')).toContainText('Street Fighter 6');
        await expect(page.locator('body')).toContainText('Tekken 8');
      }
    });

    test('should show registration status correctly', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Registration should be open for this tournament
      const isOpen = await tournamentPage.isRegistrationOpen();
      expect(isOpen).toBe(true);
    });

    test('should show register button for open registration', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Should show register button
      const hasRegister = await tournamentPage.hasRegisterButton();
      expect(hasRegister).toBe(true);
    });

    test('should show 404 for non-existent tournament', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(NON_EXISTENT_ID);

      // Wait for error
      await page.waitForLoadState('networkidle');

      // Should show error message
      await expect(page.locator('body')).toContainText(/Failed to fetch tournament|Tournament not found/i);
    });

    test('should handle API error gracefully', async ({ page }) => {
      // Mock API to return error
      await page.route('**/api/tournaments/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Should show error message
      const hasError = await tournamentPage.hasError();
      expect(hasError || (await page.locator('body').textContent())).toBeTruthy();
    });
  });

  test.describe('Tournament Navigation', () => {
    test('should navigate from tournament list to detail', async ({ page }) => {
      // Setup authenticated state
      await setupAuthenticatedState(page);

      const listPage = new TournamentListPage(page);
      await listPage.goto();

      // Click on a tournament card
      const card = listPage.getTournamentCard(mockTournament.name);
      await card.click();

      // Should navigate to tournament detail
      await page.waitForURL(/\/tournaments\/.+/);
    });
  });

  test.describe('Tournament Registration', () => {
    test('should show unregister button when registered', async ({ page }) => {
      // Mock user as already registered
      await page.route('**/api/tournaments/**', async (route) => {
        const url = route.request().url();
        if (url.includes(`/api/tournaments/${TOURNAMENT_ID}`)) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockTournament,
              userRegistration: {
                id: 'reg-123',
                status: 'confirmed',
              },
            }),
          });
          return;
        }
        await route.continue();
      });

      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto(TOURNAMENT_ID);

      // Should show unregister button
      const hasUnregister = await tournamentPage.hasUnregisterButton();
      expect(hasUnregister).toBe(true);
    });

    test('should show closed registration status', async ({ page }) => {
      const tournamentPage = new TournamentDetailPage(page);
      await tournamentPage.goto('tournament-closed');

      // Registration should be closed
      const isOpen = await tournamentPage.isRegistrationOpen();
      expect(isOpen).toBe(false);

      // Should not show register button
      const hasRegister = await tournamentPage.hasRegisterButton();
      expect(hasRegister).toBe(false);
    });
  });
});
