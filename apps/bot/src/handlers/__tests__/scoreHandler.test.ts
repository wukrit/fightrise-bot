import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleScoreReport } from '../scoreHandler.js';

vi.mock('@fightrise/database', () => ({
  prisma: {
    matchPlayer: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    match: {
      update: vi.fn(),
    },
    gameResult: {
      createMany: vi.fn(),
    },
  },
}));

describe('score handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report score successfully', async () => {
    const { prisma } = await import('@fightrise/database');

    vi.mocked(prisma.matchPlayer.findFirst).mockResolvedValue({
      id: 'player-1',
      matchId: 'match-1',
      isWinner: false,
    } as any);

    vi.mocked(prisma.matchPlayer.update).mockResolvedValue({} as any);
    vi.mocked(prisma.match.update).mockResolvedValue({} as any);

    const result = await handleScoreReport({
      matchId: 'test-match-id',
      playerId: 'test-player-id',
      score: 2,
      opponentScore: 1,
    });

    expect(result.success).toBe(true);
  });

  it('should validate match ID format', async () => {
    const result = await handleScoreReport({
      matchId: 'invalid',
      playerId: 'test-player-id',
      score: 2,
      opponentScore: 1,
    });

    expect(result.success).toBe(false);
  });

  it('should require valid score values', async () => {
    const result = await handleScoreReport({
      matchId: 'test-match-id',
      playerId: 'test-player-id',
      score: -1,
      opponentScore: 1,
    });

    expect(result.success).toBe(false);
  });
});
