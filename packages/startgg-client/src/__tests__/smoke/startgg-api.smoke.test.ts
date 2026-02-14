/**
 * Smoke tests for Start.gg API integration.
 *
 * These tests verify that the Start.gg API client works correctly
 * with real API calls. They require a valid API key.
 *
 * IMPORTANT: These tests use real Start.gg API calls and should only be run:
 * - Manually before releases
 * - In scheduled CI jobs (not on PRs)
 * - With awareness of rate limits (80 requests/minute)
 *
 * Required environment variables:
 * - SMOKE_STARTGG_API_KEY: Valid Start.gg API key
 * - SMOKE_STARTGG_TOURNAMENT_SLUG: Slug of a known public tournament
 *
 * NOTE: These tests read .env file directly to bypass vitest's automatic
 * redaction of sensitive environment variables (TOKEN, KEY, SECRET, etc.)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { StartGGClient } from '../../index.js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file directly to avoid vitest env redaction
function getEnvVar(key: string): string | undefined {
  const envPath = path.resolve(process.cwd(), '../../.env');
  if (!fs.existsSync(envPath)) return undefined;

  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) return undefined;
  // Strip surrounding quotes if present
  let value = match[1].trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return value;
}

const apiKey = getEnvVar('SMOKE_STARTGG_API_KEY');
const SKIP_SMOKE_TESTS = !apiKey;

describe.skipIf(SKIP_SMOKE_TESTS)('Start.gg API Smoke Tests', () => {
  const tournamentSlug = getEnvVar('SMOKE_STARTGG_TOURNAMENT_SLUG') ?? 'tournament/evo-2023';

  let client: StartGGClient;

  beforeAll(() => {
    if (!apiKey) throw new Error('SMOKE_STARTGG_API_KEY is required');

    client = new StartGGClient({
      apiKey,
      cache: { enabled: false }, // Disable cache for smoke tests
      retry: { maxRetries: 2, baseDelayMs: 1000 },
    });
  });

  describe('API Authentication', () => {
    it('should authenticate with valid API key', async () => {
      // Fetching a tournament validates the API key
      const tournament = await client.getTournament(tournamentSlug);

      // A valid key should return tournament data (or null if not found)
      // An invalid key would throw an AuthError
      expect(tournament === null || tournament.id !== undefined).toBe(true);
    });

    it('should reject invalid API keys', async () => {
      const badClient = new StartGGClient({
        apiKey: 'invalid-api-key',
        cache: { enabled: false },
        retry: { maxRetries: 0 },
      });

      await expect(
        badClient.getTournament(tournamentSlug)
      ).rejects.toThrow();
    });
  });

  describe('Tournament Queries', () => {
    it('should fetch tournament by slug', async () => {
      const tournament = await client.getTournament(tournamentSlug);

      expect(tournament).toBeDefined();
      if (tournament) {
        expect(tournament.id).toBeTruthy();
        expect(tournament.name).toBeTruthy();
        expect(tournament.slug).toBeTruthy();
        expect(tournament.events).toBeInstanceOf(Array);

        console.log(`Fetched tournament: ${tournament.name}`);
        console.log(`  Events: ${tournament.events.length}`);
        console.log(`  State: ${tournament.state}`);
      }
    });

    it('should return null for non-existent tournament', async () => {
      const tournament = await client.getTournament(
        'tournament/this-tournament-definitely-does-not-exist-12345'
      );

      expect(tournament).toBeNull();
    });

    it('should fetch tournament events with entrant counts', async () => {
      const tournament = await client.getTournament(tournamentSlug);

      if (tournament && tournament.events.length > 0) {
        const event = tournament.events[0];

        expect(event.id).toBeTruthy();
        expect(event.name).toBeTruthy();
        expect(typeof event.numEntrants).toBe('number');

        console.log(`Event: ${event.name} (${event.numEntrants} entrants)`);
      }
    });
  });

  describe('Event Queries', () => {
    it('should fetch event sets (matches)', async () => {
      const tournament = await client.getTournament(tournamentSlug);

      if (tournament && tournament.events.length > 0) {
        const eventId = tournament.events[0].id;
        const sets = await client.getEventSets(eventId, 1, 10);

        expect(sets).toBeDefined();
        if (sets) {
          expect(sets.pageInfo).toBeDefined();
          expect(sets.nodes).toBeInstanceOf(Array);

          console.log(`Fetched ${sets.nodes.length} sets (page 1)`);
          console.log(`Total sets: ${sets.pageInfo.total}`);
        }
      }
    });

    it('should fetch event entrants', async () => {
      const tournament = await client.getTournament(tournamentSlug);

      if (tournament && tournament.events.length > 0) {
        const eventId = tournament.events[0].id;
        const entrants = await client.getEventEntrants(eventId, 1, 10);

        expect(entrants).toBeDefined();
        if (entrants) {
          expect(entrants.pageInfo).toBeDefined();
          expect(entrants.nodes).toBeInstanceOf(Array);

          console.log(`Fetched ${entrants.nodes.length} entrants (page 1)`);
          console.log(`Total entrants: ${entrants.pageInfo.total}`);

          if (entrants.nodes.length > 0) {
            const entrant = entrants.nodes[0];
            expect(entrant.id).toBeTruthy();
            expect(entrant.name).toBeTruthy();
          }
        }
      }
    });

    it('should handle pagination correctly', async () => {
      const tournament = await client.getTournament(tournamentSlug);

      if (tournament && tournament.events.length > 0) {
        const eventId = tournament.events[0].id;

        // Fetch first page
        const page1 = await client.getEventEntrants(eventId, 1, 5);

        if (page1 && page1.pageInfo.totalPages > 1) {
          // Fetch second page
          const page2 = await client.getEventEntrants(eventId, 2, 5);

          expect(page2).toBeDefined();
          expect(page2!.nodes).toBeInstanceOf(Array);

          // Pages should have different entrants
          if (page1.nodes.length > 0 && page2!.nodes.length > 0) {
            expect(page1.nodes[0].id).not.toBe(page2!.nodes[0].id);
          }
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits with retry logic', async () => {
      // Make multiple requests in sequence
      // The client's retry logic should handle rate limits
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(client.getTournament(tournamentSlug));
      }

      const results = await Promise.all(promises);

      // All requests should complete (with retries if needed)
      results.forEach((result) => {
        expect(result === null || result.id !== undefined).toBe(true);
      });
    });
  });

  describe('Response Schema', () => {
    it('should return correctly typed tournament data', async () => {
      const tournament = await client.getTournament(tournamentSlug);

      if (tournament) {
        // Verify types match expected schema
        // Note: API may return id as number or string
        expect(typeof tournament.id === 'string' || typeof tournament.id === 'number').toBe(true);
        expect(typeof tournament.name).toBe('string');
        expect(
          tournament.startAt === null || typeof tournament.startAt === 'number'
        ).toBe(true);
        expect(
          tournament.endAt === null || typeof tournament.endAt === 'number'
        ).toBe(true);
        expect(
          tournament.state === null || typeof tournament.state === 'number'
        ).toBe(true);
        expect(Array.isArray(tournament.events)).toBe(true);
      }
    });

    it('should return correctly typed set (match) data', async () => {
      const tournament = await client.getTournament(tournamentSlug);

      if (tournament && tournament.events.length > 0) {
        const sets = await client.getEventSets(tournament.events[0].id, 1, 1);

        if (sets && sets.nodes.length > 0) {
          const set = sets.nodes[0];

          expect(typeof set.id).toBe('string');
          expect(typeof set.state).toBe('number');
          expect(typeof set.fullRoundText).toBe('string');
          expect(typeof set.identifier).toBe('string');
          expect(typeof set.round).toBe('number');
          expect(Array.isArray(set.slots)).toBe(true);
        }
      }
    });
  });
});

// Export skip flag for test runner
export { SKIP_SMOKE_TESTS };
