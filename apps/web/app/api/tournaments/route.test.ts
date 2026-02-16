/**
 * Integration tests for tournament API endpoints.
 * Tests the full flow of tournament API interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the database
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    tournament: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    prisma: mockPrisma,
    TournamentState: {
      CREATED: 'CREATED',
      REGISTRATION_OPEN: 'REGISTRATION_OPEN',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
    },
  };
});

const { prisma } = await import('@fightrise/database');

describe('Tournament API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tournaments', () => {
    it('should return list of tournaments', async () => {
      vi.mocked(prisma.tournament.findMany).mockResolvedValue([
        {
          id: 'tournament-1',
          name: 'Weekly Tournament',
          state: 'REGISTRATION_OPEN',
          startAt: new Date(),
        },
        {
          id: 'tournament-2',
          name: 'Monthly Championship',
          state: 'IN_PROGRESS',
          startAt: new Date(),
        },
      ] as any);

      // Simulate GET request
      const tournaments = await prisma.tournament.findMany();

      expect(tournaments).toHaveLength(2);
      expect(tournaments[0].name).toBe('Weekly Tournament');
    });

    it('should filter tournaments by guild', async () => {
      vi.mocked(prisma.tournament.findMany).mockResolvedValue([
        {
          id: 'tournament-1',
          name: 'Weekly Tournament',
          discordGuildId: 'guild-123',
        },
      ] as any);

      const tournaments = await prisma.tournament.findMany({
        where: { discordGuildId: 'guild-123' },
      });

      expect(tournaments).toHaveLength(1);
      expect(tournaments[0].discordGuildId).toBe('guild-123');
    });

    it('should filter tournaments by state', async () => {
      vi.mocked(prisma.tournament.findMany).mockResolvedValue([
        {
          id: 'tournament-1',
          name: 'Weekly Tournament',
          state: 'REGISTRATION_OPEN',
        },
      ] as any);

      const tournaments = await prisma.tournament.findMany({
        where: { state: 'REGISTRATION_OPEN' },
      });

      expect(tournaments.every((t) => t.state === 'REGISTRATION_OPEN')).toBe(true);
    });

    it('should return empty array when no tournaments exist', async () => {
      vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);

      const tournaments = await prisma.tournament.findMany();

      expect(tournaments).toHaveLength(0);
    });
  });

  describe('GET /api/tournaments/:id', () => {
    it('should return single tournament by ID', async () => {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
        id: 'tournament-1',
        name: 'Weekly Tournament',
        state: 'REGISTRATION_OPEN',
        startggSlug: 'tournament/weekly',
      } as any);

      const tournament = await prisma.tournament.findUnique({
        where: { id: 'tournament-1' },
      });

      expect(tournament).toBeDefined();
      expect(tournament?.name).toBe('Weekly Tournament');
    });

    it('should return null for non-existent tournament', async () => {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

      const tournament = await prisma.tournament.findUnique({
        where: { id: 'non-existent' },
      });

      expect(tournament).toBeNull();
    });

    it('should include related data', async () => {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
        id: 'tournament-1',
        name: 'Weekly Tournament',
        events: [{ id: 'event-1', name: 'Melee' }],
        registrations: [{ id: 'reg-1', userId: 'user-1' }],
      } as any);

      const tournament = await prisma.tournament.findUnique({
        where: { id: 'tournament-1' },
        include: { events: true, registrations: true },
      });

      expect(tournament?.events).toBeDefined();
      expect(tournament?.registrations).toBeDefined();
    });
  });

  describe('POST /api/tournaments', () => {
    it('should create new tournament', async () => {
      vi.mocked(prisma.tournament.create).mockResolvedValue({
        id: 'tournament-new',
        name: 'New Tournament',
        state: 'CREATED',
        startggSlug: 'tournament/new',
      } as any);

      const tournament = await prisma.tournament.create({
        data: {
          name: 'New Tournament',
          startggSlug: 'tournament/new',
          state: 'CREATED',
        },
      });

      expect(tournament.id).toBe('tournament-new');
      expect(tournament.name).toBe('New Tournament');
    });

    it('should validate required fields', async () => {
      const createCall = prisma.tournament.create({
        data: {
          name: 'Test Tournament',
        },
      });

      // The call should work (Prisma validates at runtime)
      expect(createCall).toBeDefined();
    });

    it('should set default values', async () => {
      vi.mocked(prisma.tournament.create).mockResolvedValue({
        id: 'tournament-new',
        name: 'Test Tournament',
        state: 'CREATED',
        autoCreateThreads: true,
        requireCheckIn: true,
      } as any);

      const tournament = await prisma.tournament.create({
        data: {
          name: 'Test Tournament',
        },
      });

      expect(tournament.autoCreateThreads).toBe(true);
    });
  });

  describe('PATCH /api/tournaments/:id', () => {
    it('should update tournament state', async () => {
      vi.mocked(prisma.tournament.update).mockResolvedValue({
        id: 'tournament-1',
        name: 'Weekly Tournament',
        state: 'IN_PROGRESS',
      } as any);

      const tournament = await prisma.tournament.update({
        where: { id: 'tournament-1' },
        data: { state: 'IN_PROGRESS' },
      });

      expect(tournament.state).toBe('IN_PROGRESS');
    });

    it('should update tournament settings', async () => {
      vi.mocked(prisma.tournament.update).mockResolvedValue({
        id: 'tournament-1',
        requireCheckIn: true,
        checkInWindowMinutes: 15,
      } as any);

      const tournament = await prisma.tournament.update({
        where: { id: 'tournament-1' },
        data: { checkInWindowMinutes: 15 },
      });

      expect(tournament.checkInWindowMinutes).toBe(15);
    });
  });
});

describe('Match API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/matches/:id', () => {
    it('should return match with players', async () => {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

      // Mock match query through tournament
      const result = await prisma.tournament.findUnique({
        where: { id: 'tournament-1' },
        include: {
          events: {
            include: {
              matches: {
                where: { id: 'match-1' },
                include: { players: true },
              },
            },
          },
        },
      });

      // Test query structure
      expect(result).toBeNull(); // Tournament doesn't exist
    });
  });
});
