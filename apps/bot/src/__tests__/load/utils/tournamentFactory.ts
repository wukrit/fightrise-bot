/**
 * Tournament factory for load testing.
 * Creates test tournaments, events, and matches in the database.
 */

import { prisma, TournamentState, MatchState } from '@fightrise/database';
import { randomUUID } from 'crypto';

export interface TournamentFactoryConfig {
  tournamentCount: number;
  eventCount: number;
  matchCount: number;
  state?: TournamentState;
}

// Counter for unique IDs
let idCounter = 0;

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${idCounter++}-${randomUUID().slice(0, 8)}`;
}

/**
 * Create multiple test tournaments with events and matches.
 */
export async function createTestTournaments(config: TournamentFactoryConfig) {
  const { tournamentCount, eventCount, matchCount, state = TournamentState.IN_PROGRESS } = config;

  const tournaments = [];

  for (let t = 0; t < tournamentCount; t++) {
    const tournamentId = generateId('load-test');

    const tournament = await prisma.tournament.create({
      data: {
        id: tournamentId,
        startggId: generateId('startgg-tournament'),
        startggSlug: `tournament/load-test-${t}`,
        name: `Load Test Tournament ${t + 1}`,
        startAt: new Date(),
        state,
        pollIntervalMs: 15000, // Active polling
      },
    });

    // Create events for this tournament
    const events = [];
    for (let e = 0; e < eventCount; e++) {
      const eventId = generateId('load-test-event');
      const matchesPerEvent = Math.ceil(matchCount / eventCount);

      const event = await prisma.event.create({
        data: {
          id: eventId,
          startggId: generateId('startgg-event'),
          name: `Event ${e + 1} - ${tournament.name}`,
          numEntrants: 8,
          state: 3, // COMPLETE
          tournamentId: tournament.id,
        },
      });

      // Create matches for this event
      for (let m = 0; m < matchesPerEvent; m++) {
        const roundNum = Math.ceil((m + 1) / 4);
        await prisma.match.create({
          data: {
            id: generateId('load-test-match'),
            startggSetId: generateId('startgg-set'),
            identifier: `A${m + 1}`,
            roundText: `Round ${roundNum}`,
            eventId: event.id,
            round: roundNum,
            state: MatchState.COMPLETED,
          },
        });
      }

      events.push(event);
    }

    tournaments.push({ tournament, events });
  }

  return tournaments;
}

/**
 * Clean up all load test data from the database.
 */
export async function cleanupTestData(prefix: string = 'load-test') {
  // Delete matches
  await prisma.match.deleteMany({
    where: {
      id: { startsWith: prefix },
    },
  });

  // Delete events
  await prisma.event.deleteMany({
    where: {
      id: { startsWith: prefix },
    },
  });

  // Delete tournaments
  await prisma.tournament.deleteMany({
    where: {
      id: { startsWith: prefix },
    },
  });
}

/**
 * Get current load test data counts.
 */
export async function getLoadTestDataCounts(prefix: string = 'load-test') {
  const [tournamentCount, eventCount, matchCount] = await Promise.all([
    prisma.tournament.count({
      where: { id: { startsWith: prefix } },
    }),
    prisma.event.count({
      where: { id: { startsWith: prefix } },
    }),
    prisma.match.count({
      where: { id: { startsWith: prefix } },
    }),
  ]);

  return { tournamentCount, eventCount, matchCount };
}
