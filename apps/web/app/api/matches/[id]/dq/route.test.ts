/**
 * Integration tests for match DQ (disqualification) API endpoint.
 * Uses PostgreSQL test database with mocked database client.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Test database URL - connects to existing docker-compose postgres
const TEST_DATABASE_URL = 'postgresql://fightrise:devpassword@postgres:5432/fightrise_test';

// Create test prisma client
const testPrisma = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
});

// Mock auth and rate limiting
const mockSession = {
  user: {
    discordId: 'test-discord-123',
    id: 'test-user-123',
  },
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, reset: Date.now() + 60000 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Headers()),
  RATE_LIMIT_CONFIGS: {
    read: { limit: 100, window: 60 },
    write: { limit: 50, window: 60 },
  },
}));

// Mock the database package to use test database
vi.mock('@fightrise/database', async () => {
  const { PrismaClient } = await import('@prisma/client');

  const testPrisma = new PrismaClient({
    datasources: { db: { url: TEST_DATABASE_URL } },
  });

  return {
    prisma: testPrisma,
    default: testPrisma,
    MatchState: {
      NOT_STARTED: 'NOT_STARTED',
      CALLED: 'CALLED',
      CHECKED_IN: 'CHECKED_IN',
      IN_PROGRESS: 'IN_PROGRESS',
      PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
      COMPLETED: 'COMPLETED',
      DISPUTED: 'DISPUTED',
      DQ: 'DQ',
    },
    AuditAction: {
      PLAYER_DQ: 'PLAYER_DQ',
    },
    AuditSource: {
      API: 'API',
    },
    AdminRole: {
      OWNER: 'OWNER',
      ADMIN: 'ADMIN',
      MODERATOR: 'MODERATOR',
    },
  };
});

async function clearTestDatabase(client: PrismaClient) {
  const tablesToClear = ['GameResult', 'Dispute', 'AuditLog', 'ApiKey', 'MatchPlayer', 'Match', 'Registration', 'Event', 'TournamentAdmin', 'Tournament', 'GuildConfig', 'User'];
  for (const table of tablesToClear) {
    try {
      await client.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch {
      // Table might not exist
    }
  }
}

// Helper to create test data with proper session user
async function createTestData(client: PrismaClient) {
  // User with discordId matching the mock session
  const user1 = await client.user.create({
    data: {
      discordId: 'test-discord-123',
      id: 'test-user-123',
      discordUsername: 'TestUser1',
      displayName: 'Test User 1',
    },
  });
  const user2 = await client.user.create({
    data: {
      discordId: 'test-discord-456',
      id: 'test-user-456',
      discordUsername: 'TestUser2',
      displayName: 'Test User 2',
    },
  });
  const tournament = await client.tournament.create({
    data: {
      startggId: 'test-tournament-1',
      startggSlug: 'test/tournament-1',
      name: 'Test Tournament',
      state: 'IN_PROGRESS',
      discordGuildId: 'test-guild',
    },
  });
  const event = await client.event.create({
    data: {
      tournamentId: tournament.id,
      startggId: 'test-event-1',
      name: 'Test Event',
    },
  });
  const match = await client.match.create({
    data: {
      eventId: event.id,
      startggSetId: 'test-set-1',
      identifier: 'A1',
      roundText: 'Winners Round 1',
      round: 1,
      state: 'IN_PROGRESS',
    },
  });
  const player1 = await client.matchPlayer.create({
    data: {
      matchId: match.id,
      userId: user1.id,
      playerName: 'Player 1',
    },
  });
  const player2 = await client.matchPlayer.create({
    data: {
      matchId: match.id,
      userId: user2.id,
      playerName: 'Player 2',
    },
  });

  return { user1, user2, tournament, event, match, player1, player2 };
}

describe('POST /api/matches/[id]/dq - Integration Tests', () => {
  beforeAll(async () => {
    await testPrisma.$connect();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await clearTestDatabase(testPrisma);
  });

  it('should DQ player successfully', async () => {
    const { match, player1 } = await createTestData(testPrisma);

    const { POST: dqPlayer } = await import('./route');
    const request = new NextRequest('http://localhost/api/matches/' + match.id + '/dq', {
      method: 'POST',
      body: JSON.stringify({
        playerId: player1.id,
        reason: 'Player did not show up for match',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await dqPlayer(request, { params: Promise.resolve({ id: match.id }) });

    expect(response.status).toBe(200);

    // Verify match state changed to DQ
    const updatedMatch = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(updatedMatch?.state).toBe('DQ');

    // Verify DQ'd player has isWinner=false and reportedScore=0
    const dqPlayerRecord = await testPrisma.matchPlayer.findUnique({ where: { id: player1.id } });
    expect(dqPlayerRecord?.isWinner).toBe(false);
    expect(dqPlayerRecord?.reportedScore).toBe(0);
  });

  it('should return 404 for non-existent match', async () => {
    const { POST: dqPlayer } = await import('./route');
    const request = new NextRequest('http://localhost/api/matches/non-existent-match/dq', {
      method: 'POST',
      body: JSON.stringify({
        playerId: 'player-1',
        reason: 'Test DQ',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await dqPlayer(request, { params: Promise.resolve({ id: 'non-existent-match' }) });

    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid input', async () => {
    const { match } = await createTestData(testPrisma);

    const { POST: dqPlayer } = await import('./route');
    const request = new NextRequest('http://localhost/api/matches/' + match.id + '/dq', {
      method: 'POST',
      body: JSON.stringify({
        // Missing playerId and reason
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await dqPlayer(request, { params: Promise.resolve({ id: match.id }) });

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent player in match', async () => {
    const { match } = await createTestData(testPrisma);

    const { POST: dqPlayer } = await import('./route');
    const request = new NextRequest('http://localhost/api/matches/' + match.id + '/dq', {
      method: 'POST',
      body: JSON.stringify({
        playerId: 'non-existent-player-id',
        reason: 'Test DQ',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await dqPlayer(request, { params: Promise.resolve({ id: match.id }) });

    expect(response.status).toBe(404);
  });

  it('should return 400 for already completed match', async () => {
    const { match, player1 } = await createTestData(testPrisma);

    // Update match to completed state
    await testPrisma.match.update({
      where: { id: match.id },
      data: { state: 'COMPLETED' },
    });

    const { POST: dqPlayer } = await import('./route');
    const request = new NextRequest('http://localhost/api/matches/' + match.id + '/dq', {
      method: 'POST',
      body: JSON.stringify({
        playerId: player1.id,
        reason: 'Test DQ',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await dqPlayer(request, { params: Promise.resolve({ id: match.id }) });

    expect(response.status).toBe(400);
  });
});
