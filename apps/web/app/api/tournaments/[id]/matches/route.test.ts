/**
 * Integration tests for tournament matches API endpoint.
 * Tests GET /api/tournaments/[id]/matches
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock the database
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    tournament: {
      findUnique: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
    },
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
  };
});

vi.mock('@/lib/auth', () => ({
  authOptions: {},
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

// Default mock returns valid session
let mockSession: any = {
  user: {
    discordId: 'test-discord-123',
    id: 'test-user-123',
  },
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Helper to set session for tests
function setMockSession(session: any) {
  mockSession = session;
}

const { prisma, MatchState } = await import('@fightrise/database');

import { GET as matchesGet } from './route';

describe('GET /api/tournaments/[id]/matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockSession({
      user: {
        discordId: 'test-discord-123',
        id: 'test-user-123',
      },
    });
  });

  it('should return 401 if not authenticated', async () => {
    setMockSession(null);
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return matches for tournament', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      {
        id: 'match-1',
        startggSetId: 'set-1',
        state: 'NOT_STARTED',
        round: 1,
        roundText: 'Winners Round 1',
        event: { id: 'event-1', name: 'Melee Singles' },
        players: [
          {
            id: 'player-1',
            playerName: 'Player 1',
            isCheckedIn: true,
            user: {
              id: 'user-1',
              discordId: 'discord-1',
              discordUsername: 'Player1',
              startggGamerTag: 'Player1',
              displayName: 'Player One',
            },
          },
          {
            id: 'player-2',
            playerName: 'Player 2',
            isCheckedIn: false,
            user: {
              id: 'user-2',
              discordId: 'discord-2',
              discordUsername: 'Player2',
              startggGamerTag: 'Player2',
              displayName: 'Player Two',
            },
          },
        ],
      },
    ] as any);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].players).toHaveLength(2);
  });

  it('should return empty array when no matches', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findMany).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it('should filter matches by state', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      {
        id: 'match-1',
        state: 'IN_PROGRESS',
        round: 1,
        event: { id: 'event-1', name: 'Melee Singles' },
        players: [],
      },
    ] as any);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/matches?state=IN_PROGRESS');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].state).toBe('IN_PROGRESS');
  });

  it('should return 404 for non-existent tournament', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/non-existent/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'non-existent' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Tournament not found');
  });

  it('should return matches ordered by round', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      { id: 'match-1', state: 'NOT_STARTED', round: 1, roundText: 'Winners Round 1', event: { id: 'event-1', name: 'Melee' }, players: [] },
      { id: 'match-2', state: 'NOT_STARTED', round: 2, roundText: 'Winners Round 2', event: { id: 'event-1', name: 'Melee' }, players: [] },
      { id: 'match-3', state: 'NOT_STARTED', round: 3, roundText: 'Winners Finals', event: { id: 'event-1', name: 'Melee' }, players: [] },
    ] as any);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/matches');
    const response = await matchesGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(3);
    expect(data[0].round).toBe(1);
    expect(data[1].round).toBe(2);
    expect(data[2].round).toBe(3);
  });
});
