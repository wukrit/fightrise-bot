import { beforeEach, describe, expect, it, vi } from 'vitest';

const MatchState = {
  CHECKED_IN: 'CHECKED_IN',
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  COMPLETED: 'COMPLETED',
} as const;

const mockGetServerSession = vi.fn();
const mockPrisma = {
  user: { findUnique: vi.fn() },
  match: { findUnique: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@fightrise/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

describe('POST /api/matches/[id]/report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { discordId: 'discord-1' },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      discordId: 'discord-1',
    });
  });

  it('treats opposite winner flags as agreement and completes match', async () => {
    mockPrisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      state: MatchState.CHECKED_IN,
      players: [
        { id: 'mp1', userId: 'u1', isWinner: null, reportedScore: null },
        { id: 'mp2', userId: 'u2', isWinner: false, reportedScore: 1 },
      ],
    });

    const tx = {
      match: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'm1',
          players: [
            { id: 'mp1', userId: 'u1', isWinner: true, reportedScore: 2 },
            { id: 'mp2', userId: 'u2', isWinner: false, reportedScore: 1 },
          ],
        }),
      },
      matchPlayer: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));

    const route = await import('./route');
    const request = new Request('http://localhost/api/matches/m1/report', {
      method: 'POST',
      body: JSON.stringify({ winnerId: 'u1', player1Score: 2, player2Score: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await route.POST(request as never, { params: Promise.resolve({ id: 'm1' }) });
    expect(response.status).toBe(200);
    expect(tx.match.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'm1', state: MatchState.PENDING_CONFIRMATION },
      data: { state: MatchState.COMPLETED },
    });
  });

  it('writes reportedScore from the reporter player perspective', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { discordId: 'discord-2' },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      discordId: 'discord-2',
    });

    mockPrisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      state: MatchState.CHECKED_IN,
      players: [
        { id: 'mp1', userId: 'u1', isWinner: null, reportedScore: null },
        { id: 'mp2', userId: 'u2', isWinner: null, reportedScore: null },
      ],
    });

    const tx = {
      match: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'm1',
          players: [
            { id: 'mp1', userId: 'u1', isWinner: null, reportedScore: null },
            { id: 'mp2', userId: 'u2', isWinner: true, reportedScore: 2 },
          ],
        }),
      },
      matchPlayer: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));

    const route = await import('./route');
    const request = new Request('http://localhost/api/matches/m1/report', {
      method: 'POST',
      body: JSON.stringify({ winnerId: 'u2', player1Score: 0, player2Score: 2 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await route.POST(request as never, { params: Promise.resolve({ id: 'm1' }) });
    expect(response.status).toBe(200);
    expect(tx.matchPlayer.update).toHaveBeenCalledWith({
      where: { id: 'mp2' },
      data: {
        isWinner: true,
        reportedScore: 2,
      },
    });
  });
});
