/**
 * Tournament factory for load testing.
 * Creates test tournaments, events, and matches in the database.
 */

import { prisma, TournamentState, MatchState } from '@fightrise/database';

export interface TournamentFactoryConfig {
  tournamentCount: number;
  eventCount: number;
  matchCount: number;
  state?: TournamentState;
}

/**
 * Create multiple test tournaments with events and matches.
 */
export async function createTestTournaments(config: TournamentFactoryConfig) {
  const { tournamentCount, eventCount, matchCount, state = TournamentState.IN_PROGRESS } = config;

  const tournaments = [];

  for (let t = 0; t < tournamentCount; t++) {
    const tournamentId = `load-test-${Date.now()}-${t}`;

    const tournament = await prisma.tournament.create({
      data: {
        id: tournamentId,
        startggId: `startgg-tournament-${Date.now()}-${t}`,
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
      const eventId = `load-test-event-${t}-${e}`;
      const matchesPerEvent = Math.ceil(matchCount / eventCount);

      const event = await prisma.event.create({
        data: {
          id: eventId,
          startggId: `startgg-event-${Date.now()}-${t}-${e}`,
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
            id: `load-test-match-${t}-${e}-${m}`,
            startggSetId: `startgg-set-${Date.now()}-${t}-${e}-${m}`,
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
