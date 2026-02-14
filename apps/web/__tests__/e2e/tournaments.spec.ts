/**
 * E2E tests for tournament flows.
 * Tests: view tournament details, register for tournament, view my matches.
 *
 * NOTE: These tests are skipped because the pages being tested do not exist yet.
 * The pages (/tournaments, /matches, /dashboard, /my-matches) need to be implemented.
 */

import { test, expect, Page } from '@playwright/test';
import { mockAuthEndpoints, createMockSession } from './utils/auth';

/**
 * Mock tournament data for tests.
 */
const mockTournament = {
  id: 'tournament-123',
  name: 'Weekly Fighting Game Tournament',
  slug: 'weekly-fgt-001',
  startAt: '2024-03-15T18:00:00Z',
  endAt: '2024-03-15T23:00:00Z',
  venue: 'Online',
  city: 'Online',
  countryCode: 'US',
  timezone: 'America/Los_Angeles',
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

const mockUserTournaments = [
  {
    ...mockTournament,
    registrationStatus: 'registered',
    events: [{ id: 'event-1', name: 'Street Fighter 6', registrationStatus: 'registered' }],
  },
];

const mockUpcomingMatches = [
  {
    id: 'match-1',
    tournamentId: 'tournament-123',
    tournamentName: 'Weekly Fighting Game Tournament',
    eventName: 'Street Fighter 6',
    round: 1,
    opponent: {
      id: 'user-456',
      discordId: '987654321098765432',
      discordUsername: 'OpponentPlayer',
    },
    score: null,
    status: 'pending',
    startAt: '2024-03-15T19:00:00Z',
  },
];

/**
 * Helper to mock tournament API endpoints.
 */
async function mockTournamentApi(page: Page) {
  // Mock tournaments list endpoint
  await page.route('**/api/tournaments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tournaments: [mockTournament],
        total: 1,
        page: 1,
        perPage: 10,
      }),
    });
  });

  // Mock single tournament endpoint
  await page.route('**/api/tournaments/*', async (route) => {
    const tournamentId = route.url().split('/tournaments/')[1]?.split('?')[0];
    if (tournamentId === mockTournament.id) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTournament),
      });
    } else {
      await route.fulfill({ status: 404 });
    }
  });

  // Mock user tournaments endpoint
  await page.route('**/api/tournaments/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tournaments: mockUserTournaments }),
    });
  });

  // Mock matches endpoint
  await page.route('**/api/matches', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ matches: mockUpcomingMatches }),
    });
  });

  // Mock registration endpoint
  await page.route('**/api/tournaments/*/register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

test.describe.skip('Tournament Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockTournamentApi(page);
  });

  test.describe('View Tournament List', () => {
    test('should display list of available tournaments', async ({ page }) => {
      await page.goto('/tournaments');

      // Should show tournament list
      await expect(page.locator('h1')).toContainText(/tournaments/i);

      // Should contain tournament name
      await expect(page.locator('body')).toContainText(mockTournament.name);
    });

    test('should handle empty tournament list', async ({ page }) => {
      await page.route('**/api/tournaments', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tournaments: [], total: 0 }),
        });
      });

      await page.goto('/tournaments');

      // Should show empty state
      await expect(page.locator('body')).toContainText(/no tournaments/i);
    });
  });

  test.describe('View Tournament Details', () => {
    test('should display tournament information', async ({ page }) => {
      await page.goto(`/tournaments/${mockTournament.id}`);

      // Should show tournament name
      await expect(page.locator('h1')).toContainText(mockTournament.name);

      // Should show venue information
      await expect(page.locator('body')).toContainText(mockTournament.venue);

      // Should list events
      for (const event of mockTournament.events) {
        await expect(page.locator('body')).toContainText(event.name);
      }
    });

    test('should show 404 for non-existent tournament', async ({ page }) => {
      await page.goto('/tournaments/non-existent-id');

      // Should show error page
      await expect(page.locator('body')).toContainText(/not found/i);
    });
  });

  test.describe('Register for Tournament', () => {
    test('should show register button for unregistered tournament', async ({ page }) => {
      await page.goto(`/tournaments/${mockTournament.id}`);

      // Should have a register button
      const registerButton = page.getByRole('button', { name: /register/i });
      await expect(registerButton).toBeVisible();
    });

    test('should successfully register for tournament', async ({ page }) => {
      await page.goto(`/tournaments/${mockTournament.id}`);

      // Click register button
      await page.getByRole('button', { name: /register/i }).click();

      // Should show success message
      await expect(page.locator('body')).toContainText(/successfully registered/i);
    });

    test('should handle registration error', async ({ page }) => {
      // Override the register endpoint to return error
      await page.route('**/api/tournaments/*/register', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Registration is closed' }),
        });
      });

      await page.goto(`/tournaments/${mockTournament.id}`);

      // Click register button
      await page.getByRole('button', { name: /register/i }).click();

      // Should show error message
      await expect(page.locator('body')).toContainText(/registration is closed/i);
    });
  });

  test.describe('View My Matches', () => {
    test('should display upcoming matches', async ({ page }) => {
      await page.goto('/my-matches');

      // Should show match information
      await expect(page.locator('body')).toContainText(mockUpcomingMatches[0].eventName);
      await expect(page.locator('body')).toContainText(
        mockUpcomingMatches[0].opponent.discordUsername
      );
    });

    test('should handle no matches state', async ({ page }) => {
      await page.route('**/api/matches', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ matches: [] }),
        });
      });

      await page.goto('/my-matches');

      // Should show empty state
      await expect(page.locator('body')).toContainText(/no upcoming matches/i);
    });
  });

  test.describe('Authenticated Routes', () => {
    test('should redirect unauthenticated user from tournament pages', async ({ page }) => {
      // Override auth to be unauthenticated
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });

      await page.goto('/tournaments');

      // Should redirect to sign in
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });
});
