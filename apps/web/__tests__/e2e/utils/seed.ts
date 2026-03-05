/**
 * Database seed utility for E2E tests.
 *
 * This module seeds the test database with realistic test data
 * that matches the Prisma schema and API response formats.
 *
 * Usage:
 *   import { seedTestData, clearTestData } from './utils/seed';
 *
 *   // Seed before tests
 *   await seedTestData();
 *
 *   // Clear after tests (optional)
 *   await clearTestData();
 */

import { PrismaClient, TournamentState, EventState, MatchState, RegistrationSource, RegistrationStatus, AdminRole } from '@prisma/client';

// Create a fresh PrismaClient instance to avoid any cached connections
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

/**
 * Test data constants - these IDs are used across tests for consistency
 */
export const TEST_USERS = {
  admin: {
    id: 'test-admin-user-cuid',
    discordId: '987654321098765432',
    discordUsername: 'AdminUser',
    discordAvatar: null,
    email: 'admin@fightrise.test',
  },
  tournamentAdmin: {
    id: 'test-tournament-admin-cuid',
    discordId: '111222333444555666',
    discordUsername: 'TournamentAdmin',
    discordAvatar: null,
    email: 'tournamentadmin@fightrise.test',
  },
  player: {
    id: 'test-player-user-cuid',
    discordId: '555444333222111000',
    discordUsername: 'RegularPlayer',
    discordAvatar: null,
    email: 'player@fightrise.test',
  },
  player2: {
    id: 'test-player-user-2-cuid',
    discordId: '555444333222111001',
    discordUsername: 'PlayerTwo',
    discordAvatar: null,
    email: 'player2@fightrise.test',
  },
};

export const TEST_TOURNAMENTS = {
  upcoming: {
    id: 'test-tournament-upcoming-cuid',
    startggId: 'test-startgg-123',
    startggSlug: 'test-weekly-tournament',
    name: 'Weekly Tournament',
    state: TournamentState.REGISTRATION_OPEN,
  },
  ongoing: {
    id: 'test-tournament-ongoing-cuid',
    startggId: 'test-startgg-456',
    startggSlug: 'test-monthly-championship',
    name: 'Monthly Championship',
    state: TournamentState.IN_PROGRESS,
  },
  completed: {
    id: 'test-tournament-completed-cuid',
    startggId: 'test-startgg-789',
    startggSlug: 'test-past-tournament',
    name: 'Past Tournament',
    state: TournamentState.COMPLETED,
  },
};

/**
 * Seed the database with test data.
 * Call this in a globalSetup or beforeEach hook.
 */
export async function seedTestData(): Promise<void> {
  console.log('Seeding test database...');

  // Clear existing test data first
  await clearTestData();

  // Create test users
  await Promise.all([
    prisma.user.upsert({
      where: { id: TEST_USERS.admin.id },
      update: TEST_USERS.admin,
      create: TEST_USERS.admin,
    }),
    prisma.user.upsert({
      where: { id: TEST_USERS.tournamentAdmin.id },
      update: TEST_USERS.tournamentAdmin,
      create: TEST_USERS.tournamentAdmin,
    }),
    prisma.user.upsert({
      where: { id: TEST_USERS.player.id },
      update: TEST_USERS.player,
      create: TEST_USERS.player,
    }),
    prisma.user.upsert({
      where: { id: TEST_USERS.player2.id },
      update: TEST_USERS.player2,
      create: TEST_USERS.player2,
    }),
  ]);

  // Create tournaments
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const tournaments = await Promise.all([
    prisma.tournament.upsert({
      where: { id: TEST_TOURNAMENTS.upcoming.id },
      update: {
        ...TEST_TOURNAMENTS.upcoming,
        startAt: nextWeek,
        endAt: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
      create: {
        ...TEST_TOURNAMENTS.upcoming,
        startAt: nextWeek,
        endAt: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.tournament.upsert({
      where: { id: TEST_TOURNAMENTS.ongoing.id },
      update: {
        ...TEST_TOURNAMENTS.ongoing,
        startAt: now,
        endAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
      create: {
        ...TEST_TOURNAMENTS.ongoing,
        startAt: now,
        endAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.tournament.upsert({
      where: { id: TEST_TOURNAMENTS.completed.id },
      update: {
        ...TEST_TOURNAMENTS.completed,
        startAt: lastWeek,
        endAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
      create: {
        ...TEST_TOURNAMENTS.completed,
        startAt: lastWeek,
        endAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Create events for each tournament
  const events = await Promise.all(
    tournaments.map((tournament) =>
      prisma.event.upsert({
        where: { startggId: `event-${tournament.startggId}` },
        update: {
          tournamentId: tournament.id,
          name: `${tournament.name} - Main`,
          numEntrants: 8,
          state: tournament.state === TournamentState.COMPLETED
            ? EventState.COMPLETED
            : tournament.state === TournamentState.IN_PROGRESS
            ? EventState.ACTIVE
            : EventState.CREATED,
        },
        create: {
          tournamentId: tournament.id,
          startggId: `event-${tournament.startggId}`,
          name: `${tournament.name} - Main`,
          numEntrants: 8,
          state: tournament.state === TournamentState.COMPLETED
            ? EventState.COMPLETED
            : tournament.state === TournamentState.IN_PROGRESS
            ? EventState.ACTIVE
            : EventState.CREATED,
        },
      })
    )
  );

  // Create registrations for the upcoming tournament
  const upcomingEvent = events[0];
  await Promise.all([
    prisma.registration.upsert({
      where: {
        userId_eventId: {
          userId: TEST_USERS.player.id,
          eventId: upcomingEvent.id,
        },
      },
      update: {
        source: RegistrationSource.DISCORD,
        status: RegistrationStatus.CONFIRMED,
      },
      create: {
        userId: TEST_USERS.player.id,
        tournamentId: upcomingEvent.tournamentId,
        eventId: upcomingEvent.id,
        source: RegistrationSource.DISCORD,
        status: RegistrationStatus.CONFIRMED,
      },
    }),
    prisma.registration.upsert({
      where: {
        userId_eventId: {
          userId: TEST_USERS.player2.id,
          eventId: upcomingEvent.id,
        },
      },
      update: {
        source: RegistrationSource.DISCORD,
        status: RegistrationStatus.CONFIRMED,
      },
      create: {
        userId: TEST_USERS.player2.id,
        tournamentId: upcomingEvent.tournamentId,
        eventId: upcomingEvent.id,
        source: RegistrationSource.DISCORD,
        status: RegistrationStatus.CONFIRMED,
      },
    }),
  ]);

  // Create tournament admins
  await Promise.all([
    prisma.tournamentAdmin.upsert({
      where: {
        userId_tournamentId: {
          userId: TEST_USERS.admin.id,
          tournamentId: TEST_TOURNAMENTS.upcoming.id,
        },
      },
      update: { role: AdminRole.OWNER },
      create: {
        userId: TEST_USERS.admin.id,
        tournamentId: TEST_TOURNAMENTS.upcoming.id,
        role: AdminRole.OWNER,
      },
    }),
    prisma.tournamentAdmin.upsert({
      where: {
        userId_tournamentId: {
          userId: TEST_USERS.tournamentAdmin.id,
          tournamentId: TEST_TOURNAMENTS.upcoming.id,
        },
      },
      update: { role: AdminRole.ADMIN },
      create: {
        userId: TEST_USERS.tournamentAdmin.id,
        tournamentId: TEST_TOURNAMENTS.upcoming.id,
        role: AdminRole.ADMIN,
      },
    }),
  ]);

  // Create matches for the upcoming tournament
  const matchId = 'test-match-cuid-1';
  await prisma.match.upsert({
    where: { id: matchId },
    update: {
      eventId: upcomingEvent.id,
      identifier: 'A1',
      roundText: 'Winners Round 1',
      round: 1,
      state: MatchState.NOT_STARTED,
    },
    create: {
      id: matchId,
      eventId: upcomingEvent.id,
      startggSetId: 'test-set-123',
      identifier: 'A1',
      roundText: 'Winners Round 1',
      round: 1,
      state: MatchState.NOT_STARTED,
    },
  });

  // Create match players
  await Promise.all([
    prisma.matchPlayer.upsert({
      where: { id: 'test-match-player-1' },
      update: {
        matchId,
        userId: TEST_USERS.player.id,
        playerName: TEST_USERS.player.discordUsername,
        startggEntrantId: 'entrant-1',
      },
      create: {
        id: 'test-match-player-1',
        matchId,
        userId: TEST_USERS.player.id,
        playerName: TEST_USERS.player.discordUsername,
        startggEntrantId: 'entrant-1',
      },
    }),
    prisma.matchPlayer.upsert({
      where: { id: 'test-match-player-2' },
      update: {
        matchId,
        userId: TEST_USERS.player2.id,
        playerName: TEST_USERS.player2.discordUsername,
        startggEntrantId: 'entrant-2',
      },
      create: {
        id: 'test-match-player-2',
        matchId,
        userId: TEST_USERS.player2.id,
        playerName: TEST_USERS.player2.discordUsername,
        startggEntrantId: 'entrant-2',
      },
    }),
  ]);

  // Create audit log entries
  await prisma.auditLog.create({
    data: {
      action: 'TOURNAMENT_CREATED',
      entityType: 'Tournament',
      entityId: TEST_TOURNAMENTS.upcoming.id,
      userId: TEST_USERS.admin.id,
      after: { name: TEST_TOURNAMENTS.upcoming.name },
      source: 'WEB',
    },
  });

  console.log('Test database seeded successfully');
}

/**
 * Clear all test data from the database.
 * Useful for cleanup after tests or before fresh seeding.
 */
export async function clearTestData(): Promise<void> {
  console.log('Clearing test data...');

  // Delete in order respecting foreign key constraints
  await prisma.auditLog.deleteMany({
    where: { userId: { in: Object.values(TEST_USERS).map((u) => u.id) } },
  });

  await prisma.gameResult.deleteMany({
    where: {
      matchPlayerId: { in: ['test-match-player-1', 'test-match-player-2'] },
    },
  });

  await prisma.matchPlayer.deleteMany({
    where: { id: { in: ['test-match-player-1', 'test-match-player-2'] } },
  });

  await prisma.match.deleteMany({
    where: { id: { in: ['test-match-cuid-1'] } },
  });

  await prisma.registration.deleteMany({
    where: {
      userId: { in: Object.values(TEST_USERS).map((u) => u.id) },
    },
  });

  await prisma.tournamentAdmin.deleteMany({
    where: {
      userId: { in: Object.values(TEST_USERS).map((u) => u.id) },
    },
  });

  await prisma.event.deleteMany({
    where: {
      tournamentId: { in: Object.values(TEST_TOURNAMENTS).map((t) => t.id) },
    },
  });

  await prisma.tournament.deleteMany({
    where: { id: { in: Object.values(TEST_TOURNAMENTS).map((t) => t.id) } },
  });

  // Note: We don't delete users as they might be referenced elsewhere
  // In a real test scenario, you might want to delete them too

  console.log('Test data cleared');
}

/**
 * Get a single tournament by test ID
 */
export async function getTestTournament(id: keyof typeof TEST_TOURNAMENTS) {
  return prisma.tournament.findUnique({
    where: { id: TEST_TOURNAMENTS[id].id },
    include: {
      events: true,
      registrations: true,
      admins: true,
    },
  });
}

/**
 * Get all test tournaments
 */
export async function getAllTestTournaments() {
  return prisma.tournament.findMany({
    where: {
      id: { in: Object.values(TEST_TOURNAMENTS).map((t) => t.id) },
    },
    include: {
      _count: { select: { registrations: true } },
    },
  });
}

// Allow running directly for debugging
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed test data:', err);
      process.exit(1);
    });
}
