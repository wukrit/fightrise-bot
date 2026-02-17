/**
 * E2E tests for match reporting flows.
 * Tests: view match details, report score, confirm result.
 *
 * Uses page.addInitScript to intercept fetch requests before page JavaScript runs.
 */

import { test, expect } from '@playwright/test';
import { mockAuthEndpoints } from './utils/auth';

// Test match IDs
const MATCH_ID = 'match-123';
const MATCH_PLAYABLE_ID = 'match-playable'; // For tests that need reporting buttons
const MATCH_COMPLETED_ID = 'match-completed';
const MATCH_AWAITING_CONFIRMATION_ID = 'match-awaiting';

// Mock data
const mockMatchData: Record<string, any> = {
  [MATCH_ID]: {
    id: MATCH_ID,
    tournamentId: 'tournament-123',
    tournamentName: 'Weekly Fighting Game Tournament',
    round: 1,
    bestOf: 3,
    state: 'NOT_STARTED',
    checkInDeadline: null,
    player1: {
      id: 'user-current',
      name: 'CurrentPlayer',
      discordId: '123456789012345678',
      reportedScore: null,
      isWinner: null,
    },
    player2: {
      id: 'user-456',
      name: 'OpponentPlayer',
      discordId: '987654321098765432',
      reportedScore: null,
      isWinner: null,
    },
    isPlayer1: true,
    myReportedScore: null,
    myIsWinner: null,
    gameResults: [],
  },
  // Playable match for reporting interface tests
  [MATCH_PLAYABLE_ID]: {
    id: MATCH_PLAYABLE_ID,
    tournamentId: 'tournament-123',
    tournamentName: 'Weekly Fighting Game Tournament',
    round: 1,
    bestOf: 3,
    state: 'CALLED', // Playable state
    checkInDeadline: null,
    player1: {
      id: 'user-current',
      name: 'CurrentPlayer',
      discordId: '123456789012345678',
      reportedScore: null,
      isWinner: null,
    },
    player2: {
      id: 'user-456',
      name: 'OpponentPlayer',
      discordId: '987654321098765432',
      reportedScore: null,
      isWinner: null,
    },
    isPlayer1: true,
    myReportedScore: null,
    myIsWinner: null,
    gameResults: [],
  },
  [MATCH_COMPLETED_ID]: {
    id: MATCH_COMPLETED_ID,
    tournamentId: 'tournament-123',
    tournamentName: 'Weekly Fighting Game Tournament',
    round: 1,
    bestOf: 3,
    state: 'COMPLETED',
    checkInDeadline: null,
    player1: {
      id: 'user-current',
      name: 'CurrentPlayer',
      discordId: '123456789012345678',
      reportedScore: 2,
      isWinner: true,
    },
    player2: {
      id: 'user-456',
      name: 'OpponentPlayer',
      discordId: '987654321098765432',
      reportedScore: 1,
      isWinner: false,
    },
    isPlayer1: true,
    myReportedScore: 2,
    myIsWinner: true,
    gameResults: [],
  },
  [MATCH_AWAITING_CONFIRMATION_ID]: {
    id: MATCH_AWAITING_CONFIRMATION_ID,
    tournamentId: 'tournament-123',
    tournamentName: 'Weekly Fighting Game Tournament',
    round: 1,
    bestOf: 3,
    state: 'PENDING_CONFIRMATION',
    checkInDeadline: null,
    player1: {
      id: 'user-current',
      name: 'CurrentPlayer',
      discordId: '123456789012345678',
      reportedScore: null,
      isWinner: null,
    },
    player2: {
      id: 'user-456',
      name: 'OpponentPlayer',
      discordId: '987654321098765432',
      reportedScore: 2,
      isWinner: true,
    },
    isPlayer1: true,
    myReportedScore: null,
    myIsWinner: null,
    gameResults: [],
  },
};

/**
 * E2E tests for match reporting flows.
 */
test.describe('Match Reporting', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock data in page context BEFORE adding fetch mock
    await page.addInitScript((data) => {
      (window as any).__MOCK_MATCH_DATA__ = data;
    }, mockMatchData);

    // Inject fetch mock before page loads
    await page.addInitScript(() => {
      // Override fetch to return mock data
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.url;
        const urlObj = new URL(url, 'http://localhost:4000'); // Use base URL
        const pathname = urlObj.pathname;

        // Match API endpoint - check for /api/matches/<id>
        if (pathname.startsWith('/api/matches/')) {
          const matchId = pathname.split('/api/matches/')[1]?.split('?')[0];

          if (matchId && (window as any).__MOCK_MATCH_DATA__?.[matchId]) {
            const mockData = (window as any).__MOCK_MATCH_DATA__[matchId];
            return new Response(JSON.stringify(mockData), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Unknown match - return 404
          return new Response(JSON.stringify({ error: 'Match not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Report/confirm/dispute endpoints
        if (pathname.match(/^\/api\/matches\/[^/]+\/(report|confirm|dispute)$/)) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Default: call original fetch
        return originalFetch(input, init);
      };
    });

    // Mock authentication endpoints
    await mockAuthEndpoints(page);
  });

  test.describe('View Match Details', () => {
    test('should display match information', async ({ page }) => {
      await page.goto(`/matches/${MATCH_ID}`);

      // Wait for the data to load
      await page.waitForSelector('text=Weekly Fighting Game Tournament', { timeout: 10000 });

      // Should show tournament name
      await expect(page.locator('body')).toContainText('Weekly Fighting Game Tournament');

      // Should show round information
      await expect(page.locator('body')).toContainText('Round 1');
    });

    test('should show 404 for non-existent match', async ({ page }) => {
      await page.goto('/matches/non-existent-id');

      // Wait for error state
      await page.waitForSelector('text=Match not found', { timeout: 10000 });

      // Should show error page
      await expect(page.locator('body')).toContainText(/not found/i);
    });

    test('should display best of format', async ({ page }) => {
      await page.goto(`/matches/${MATCH_ID}`);

      // Wait for data to load
      await page.waitForSelector('text=Best of 3', { timeout: 10000 });

      // Should show best of information
      await expect(page.locator('body')).toContainText(/best of 3/i);
    });
  });

  test.describe('Report Score', () => {
    test('should show score reporting interface for pending match', async ({ page }) => {
      await page.goto(`/matches/${MATCH_PLAYABLE_ID}`);

      // Wait for data to load
      await page.waitForSelector('text=CurrentPlayer', { timeout: 10000 });

      // Should have score reporting buttons
      await expect(page.locator('button:has-text("beat")')).toBeVisible();
      await expect(page.locator('button:has-text("lost")')).toBeVisible();
    });

    test('should not allow reporting for completed match', async ({ page }) => {
      await page.goto(`/matches/${MATCH_COMPLETED_ID}`);

      // Wait for data to load
      await page.waitForSelector('text=Match Complete', { timeout: 10000 });

      // Should not have reporting buttons for completed match
      await expect(page.locator('button:has-text("beat")')).not.toBeVisible();
      await expect(page.locator('button:has-text("lost")')).not.toBeVisible();
    });
  });

  test.describe('Confirm Result', () => {
    test('should show confirmation for opponent reported score', async ({ page }) => {
      await page.goto(`/matches/${MATCH_AWAITING_CONFIRMATION_ID}`);

      // Wait for data to load
      await page.waitForSelector('text=Awaiting Confirm', { timeout: 10000 });

      // Should show confirm/dispute buttons
      await expect(page.locator('button:has-text("Confirm Result")')).toBeVisible();
      await expect(page.locator('button:has-text("Dispute")')).toBeVisible();
    });
  });
});
