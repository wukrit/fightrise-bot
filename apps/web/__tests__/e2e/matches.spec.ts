/**
 * E2E tests for match reporting flows.
 * Tests: view match details, report score, confirm result.
 */

import { test, expect, Page } from '@playwright/test';
import { mockAuthEndpoints } from './utils/auth';

/**
 * Mock match data for tests.
 */
const mockMatch = {
  id: 'match-123',
  tournamentId: 'tournament-123',
  tournamentName: 'Weekly Fighting Game Tournament',
  eventName: 'Street Fighter 6',
  round: 1,
  roundText: 'Round 1 - Winners',
  opponent: {
    id: 'user-456',
    discordId: '987654321098765432',
    discordUsername: 'OpponentPlayer',
    discordAvatar: null,
  },
  score: null,
  status: 'pending',
  bestOf: 3,
  startAt: '2024-03-15T19:00:00Z',
  phaseId: 'phase-1',
  phaseGroupId: 'phase-group-1',
};

const mockMatchWithScore = {
  ...mockMatch,
  score: {
    player: 1,
    opponent: 0,
  },
  status: 'reported',
};

const mockMatchAwaitingConfirmation = {
  ...mockMatch,
  score: {
    player: 2,
    opponent: 1,
  },
  status: 'awaiting_confirmation',
  reportedBy: 'opponent',
};

/**
 * Helper to mock match API endpoints.
 */
async function mockMatchApi(page: Page) {
  // Mock single match endpoint
  await page.route('**/api/matches/*', async (route) => {
    const matchId = route.url().split('/matches/')[1]?.split('?')[0];
    if (matchId === mockMatch.id) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMatch),
      });
    } else if (matchId === mockMatchWithScore.id) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMatchWithScore),
      });
    } else if (matchId === mockMatchAwaitingConfirmation.id) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMatchAwaitingConfirmation),
      });
    } else {
      await route.fulfill({ status: 404 });
    }
  });

  // Mock score reporting endpoint
  await page.route('**/api/matches/*/report', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock score confirmation endpoint
  await page.route('**/api/matches/*/confirm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock dispute endpoint
  await page.route('**/api/matches/*/dispute', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

test.describe('Match Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockMatchApi(page);
  });

  test.describe('View Match Details', () => {
    test('should display match information', async ({ page }) => {
      await page.goto(`/matches/${mockMatch.id}`);

      // Should show tournament and event name
      await expect(page.locator('body')).toContainText(mockMatch.tournamentName);
      await expect(page.locator('body')).toContainText(mockMatch.eventName);

      // Should show round information
      await expect(page.locator('body')).toContainText(mockMatch.roundText);

      // Should show opponent name
      await expect(page.locator('body')).toContainText(mockMatch.opponent.discordUsername);
    });

    test('should show 404 for non-existent match', async ({ page }) => {
      await page.goto('/matches/non-existent-id');

      // Should show error page
      await expect(page.locator('body')).toContainText(/not found/i);
    });

    test('should display best of format', async ({ page }) => {
      await page.goto(`/matches/${mockMatch.id}`);

      // Should show best of information
      await expect(page.locator('body')).toContainText(/best of 3/i);
    });
  });

  test.describe('Report Score', () => {
    test('should show score reporting interface for pending match', async ({ page }) => {
      await page.goto(`/matches/${mockMatch.id}`);

      // Should have score reporting buttons
      await expect(page.getByRole('button', { name: /win/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /loss/i })).toBeVisible();
    });

    test('should successfully report a win', async ({ page }) => {
      await page.goto(`/matches/${mockMatch.id}`);

      // Click win button
      await page.getByRole('button', { name: /win/i }).click();

      // Should show confirmation
      await expect(page.locator('body')).toContainText(/score reported/i);
    });

    test('should successfully report a loss', async ({ page }) => {
      await page.goto(`/matches/${mockMatch.id}`);

      // Click loss button
      await page.getByRole('button', { name: /loss/i }).click();

      // Should show confirmation
      await expect(page.locator('body')).toContainText(/score reported/i);
    });

    test('should handle score reporting error', async ({ page }) => {
      // Override the report endpoint to return error
      await page.route('**/api/matches/*/report', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Match already reported' }),
        });
      });

      await page.goto(`/matches/${mockMatch.id}`);

      // Try to report
      await page.getByRole('button', { name: /win/i }).click();

      // Should show error message
      await expect(page.locator('body')).toContainText(/match already reported/i);
    });

    test('should not allow reporting for completed match', async ({ page }) => {
      await page.goto(`/matches/${mockMatchWithScore.id}`);

      // Should not have reporting buttons for completed match
      await expect(page.getByRole('button', { name: /win/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /loss/i })).not.toBeVisible();

      // Should show final score
      await expect(page.locator('body')).toContainText(/2 - 0/i);
    });
  });

  test.describe('Confirm Result', () => {
    test('should show confirmation for opponent reported score', async ({ page }) => {
      await page.goto(`/matches/${mockMatchAwaitingConfirmation.id}`);

      // Should show confirm/dispute buttons
      await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /dispute/i })).toBeVisible();

      // Should show the reported score
      await expect(page.locator('body')).toContainText(/2 - 1/i);
    });

    test('should successfully confirm result', async ({ page }) => {
      await page.goto(`/matches/${mockMatchAwaitingConfirmation.id}`);

      // Click confirm button
      await page.getByRole('button', { name: /confirm/i }).click();

      // Should show success message
      await expect(page.locator('body')).toContainText(/result confirmed/i);
    });

    test('should successfully dispute result', async ({ page }) => {
      await page.goto(`/matches/${mockMatchAwaitingConfirmation.id}`);

      // Click dispute button
      await page.getByRole('button', { name: /dispute/i }).click();

      // Should show dispute submitted message
      await expect(page.locator('body')).toContainText(/dispute submitted/i);
    });

    test('should handle confirmation error', async ({ page }) => {
      // Override the confirm endpoint to return error
      await page.route('**/api/matches/*/confirm', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Confirmation deadline passed' }),
        });
      });

      await page.goto(`/matches/${mockMatchAwaitingConfirmation.id}`);

      // Try to confirm
      await page.getByRole('button', { name: /confirm/i }).click();

      // Should show error message
      await expect(page.locator('body')).toContainText(/confirmation deadline passed/i);
    });
  });

  test.describe('Authenticated Routes', () => {
    test('should redirect unauthenticated user from match pages', async ({ page }) => {
      // Override auth to be unauthenticated
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });

      await page.goto(`/matches/${mockMatch.id}`);

      // Should redirect to sign in
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });
});
