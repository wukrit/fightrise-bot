/**
 * Integration tests for admin DQ API endpoint.
 * Tests POST /api/tournaments/[id]/admin/players/[playerId]/dq
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    tournament: {
      findUnique: vi.fn(),
    },
    match: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    matchPlayer: {
      update: vi.fn(),
    },
    registration: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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
    AuditAction: {
      PLAYER_DQ: 'PLAYER_DQ',
    },
    AuditSource: {
      WEB: 'WEB',
      API: 'API',
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

vi.mock('@fightrise/startgg-client', () => ({
  StartGGClient: vi.fn().mockImplementation(() => ({
    dqEntrant: vi.fn().mockResolvedValue({ id: 'set-1', state: 'COMPLETE' }),
  })),
  StartGGError: class StartGGError extends Error {},
}));

const { prisma, MatchState, AuditAction, AuditSource } = await import('@fightrise/database');
const { requireTournamentAdmin } = await import('@/lib/tournament-admin');

import { POST as dqPost } from './route';

describe('POST /api/tournaments/[id]/admin/players/[playerId]/dq', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return 400 if validation fails (missing matchId)', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({}), // Missing matchId
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should return 404 if tournament not found', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Tournament not found');
  });

  it('should return 404 if match not found', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Match not found');
  });

  it('should return 403 if match does not belong to tournament', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: 'match-1',
      state: MatchState.IN_PROGRESS,
      startggSetId: 'sg-set-1',
      players: [],
      event: { tournamentId: 'different-tourn' },
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Match does not belong to this tournament');
  });

  it('should return 400 if match already completed', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: 'match-1',
      state: MatchState.COMPLETED,
      startggSetId: 'sg-set-1',
      players: [],
      event: { tournamentId: 'tourn-1' },
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already completed');
  });

  it('should return 404 if player not in match', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: 'match-1',
      state: MatchState.IN_PROGRESS,
      startggSetId: 'sg-set-1',
      players: [
        { id: 'other-player', userId: 'user-2', playerName: 'OtherPlayer' },
      ],
      event: { tournamentId: 'tourn-1' },
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Player not found in match');
  });

  it('should return 403 if player not registered for tournament', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: 'match-1',
      state: MatchState.IN_PROGRESS,
      startggSetId: 'sg-set-1',
      players: [
        { id: 'player-1', userId: 'user-2', playerName: 'Player1', startggEntrantId: null },
        { id: 'player-2', userId: 'user-3', playerName: 'Player2', startggEntrantId: 'sg-ent-2' },
      ],
      event: { tournamentId: 'tourn-1' },
    });
    vi.mocked(prisma.registration.findFirst).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('not registered');
  });

  it('should successfully DQ player', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: 'match-1',
      state: MatchState.IN_PROGRESS,
      startggSetId: 'sg-set-1',
      players: [
        { id: 'player-1', userId: 'user-2', playerName: 'Player1', startggEntrantId: null },
        { id: 'player-2', userId: 'user-3', playerName: 'Player2', startggEntrantId: 'sg-ent-2' },
      ],
      event: { tournamentId: 'tourn-1' },
    });
    vi.mocked(prisma.registration.findFirst).mockResolvedValue({
      id: 'reg-1',
      userId: 'user-2',
      tournamentId: 'tourn-1',
      status: 'CONFIRMED',
    });

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        matchPlayer: {
          update: vi.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1', reason: 'Late' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('disqualified');
    expect(data.message).toContain('wins by default');
  });

  it('should return 400 if match already DQd during concurrent update', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: 'match-1',
      state: MatchState.IN_PROGRESS,
      startggSetId: 'sg-set-1',
      players: [
        { id: 'player-1', userId: 'user-2', playerName: 'Player1', startggEntrantId: null },
        { id: 'player-2', userId: 'user-3', playerName: 'Player2', startggEntrantId: 'sg-ent-2' },
      ],
      event: { tournamentId: 'tourn-1' },
    });
    vi.mocked(prisma.registration.findFirst).mockResolvedValue({
      id: 'reg-1',
      userId: 'user-2',
      tournamentId: 'tourn-1',
      status: 'CONFIRMED',
    });

    // Simulate race condition - updateMany returns 0
    vi.mocked(prisma.$transaction).mockImplementation(async () => {
      throw new Error('Match has already been completed or DQd');
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/players/player-1/dq', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'match-1' }),
    });
    const response = await dqPost(request, { params: Promise.resolve({ id: 'tourn-1', playerId: 'player-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already been completed or DQd');
  });
});
