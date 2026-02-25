/**
 * Integration tests for admin matches API endpoint.
 * Tests GET /api/tournaments/[id]/admin/matches
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    tournament: {
      findUnique: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };

  return {
    prisma: mockPrisma,
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
    AdminRole: {
      OWNER: 'OWNER',
      ADMIN: 'ADMIN',
      MODERATOR: 'MODERATOR',
    },
  };
});

vi.mock('@/lib/tournament-admin', () => ({
  requireTournamentAdmin: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, reset: Date.now() + 60000 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Headers({})),
  RATE_LIMIT_CONFIGS: {
    admin: { limit: 100, window: 60 },
    write: { limit: 50, window: 60 },
  },
}));

const { prisma, MatchState } = await import('@fightrise/database');
const { requireTournamentAdmin } = await import('@/lib/tournament-admin');

import { GET as matchesGet } from '../../../../tournaments/[id]/admin/matches/route';

describe('GET /api/tournaments/[id]/admin/matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return 403 if user is not admin', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Only tournament admins can access this resource' }, { status: 403 })
    );

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(403);
  });

  it('should return 404 if tournament not found', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Tournament not found');
  });

  it('should return empty array if no events exist', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.matches).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it('should return paginated matches', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      { id: 'event-1', tournamentId: 'tourn-1', name: 'Main Bracket' },
    ]);
    vi.mocked(prisma.match.count).mockResolvedValue(2);
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      {
        id: 'match-1',
        identifier: '1',
        roundText: 'Round 1',
        round: 1,
        state: MatchState.IN_PROGRESS,
        checkInDeadline: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        event: { id: 'event-1', name: 'Main Bracket', tournamentId: 'tourn-1' },
        players: [
          {
            id: 'player-1',
            playerName: 'Player1',
            isCheckedIn: true,
            checkedInAt: new Date(),
            reportedScore: 2,
            isWinner: true,
            user: {
              id: 'user-1',
              discordId: '123456',
              discordUsername: 'player1',
              startggId: 'sg-1',
              startggGamerTag: 'Player1',
            },
          },
          {
            id: 'player-2',
            playerName: 'Player2',
            isCheckedIn: true,
            checkedInAt: new Date(),
            reportedScore: 1,
            isWinner: false,
            user: {
              id: 'user-2',
              discordId: '789012',
              discordUsername: 'player2',
              startggId: 'sg-2',
              startggGamerTag: 'Player2',
            },
          },
        ],
      },
      {
        id: 'match-2',
        identifier: '2',
        roundText: 'Round 1',
        round: 1,
        state: MatchState.CALLED,
        checkInDeadline: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        event: { id: 'event-1', name: 'Main Bracket', tournamentId: 'tourn-1' },
        players: [
          {
            id: 'player-3',
            playerName: 'Player3',
            isCheckedIn: false,
            checkedInAt: null,
            reportedScore: null,
            isWinner: null,
            user: {
              id: 'user-3',
              discordId: '345678',
              discordUsername: 'player3',
              startggId: 'sg-3',
              startggGamerTag: 'Player3',
            },
          },
          {
            id: 'player-4',
            playerName: 'Player4',
            isCheckedIn: false,
            checkedInAt: null,
            reportedScore: null,
            isWinner: null,
            user: {
              id: 'user-4',
              discordId: '901234',
              discordUsername: 'player4',
              startggId: 'sg-4',
              startggGamerTag: 'Player4',
            },
          },
        ],
      },
    ]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/matches?page=1&limit=50');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.matches).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
  });

  it('should filter by state', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      { id: 'event-1', tournamentId: 'tourn-1', name: 'Main Bracket' },
    ]);
    vi.mocked(prisma.match.count).mockResolvedValue(1);
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      {
        id: 'match-1',
        identifier: '1',
        roundText: 'Round 1',
        round: 1,
        state: MatchState.IN_PROGRESS,
        checkInDeadline: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        event: { id: 'event-1', name: 'Main Bracket', tournamentId: 'tourn-1' },
        players: [],
      },
    ]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/matches?state=IN_PROGRESS');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    expect(prisma.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          state: MatchState.IN_PROGRESS,
        }),
      })
    );
  });

  it('should filter by round', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      { id: 'event-1', tournamentId: 'tourn-1', name: 'Main Bracket' },
    ]);
    vi.mocked(prisma.match.count).mockResolvedValue(1);
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      {
        id: 'match-1',
        identifier: '1',
        roundText: 'Round 2',
        round: 2,
        state: MatchState.IN_PROGRESS,
        checkInDeadline: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        event: { id: 'event-1', name: 'Main Bracket', tournamentId: 'tourn-1' },
        players: [],
      },
    ]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/matches?round=2');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    expect(prisma.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          round: 2,
        }),
      })
    );
  });

  it('should filter by player name', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      { id: 'event-1', tournamentId: 'tourn-1', name: 'Main Bracket' },
    ]);
    vi.mocked(prisma.match.count).mockResolvedValue(1);
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      {
        id: 'match-1',
        identifier: '1',
        roundText: 'Round 1',
        round: 1,
        state: MatchState.IN_PROGRESS,
        checkInDeadline: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        event: { id: 'event-1', name: 'Main Bracket', tournamentId: 'tourn-1' },
        players: [
          {
            id: 'player-1',
            playerName: 'Player1',
            isCheckedIn: true,
            checkedInAt: new Date(),
            reportedScore: 2,
            isWinner: true,
            user: {
              id: 'user-1',
              discordId: '123456',
              discordUsername: 'player1',
              startggId: 'sg-1',
              startggGamerTag: 'Player1',
            },
          },
        ],
      },
    ]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/matches?playerName=Player1');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.matches).toHaveLength(1);
  });
});
