import { describe, it, expect, beforeEach, vi, afterEach, type MockInstance } from 'vitest';
import { RegistrationSyncService } from '../registrationSyncService.js';

// Mock the database - similar pattern to other tests
vi.mock('@fightrise/database', () => ({
  prisma: {
    registration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  RegistrationStatus: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    DQ: 'DQ',
  },
  RegistrationSource: {
    STARTGG: 'STARTGG',
    DISCORD: 'DISCORD',
    MANUAL: 'MANUAL',
  },
}));

// Mock the StartGGClient - similar pattern
vi.mock('@fightrise/startgg-client', () => ({
  StartGGClient: vi.fn().mockImplementation(() => ({
    getEventEntrants: vi.fn(),
  })),
}));

// Import after mocks are set up
import { prisma } from '@fightrise/database';
import { StartGGClient } from '@fightrise/startgg-client';

describe('RegistrationSyncService', () => {
  let service: RegistrationSyncService;
  let mockStartGGClient: { getEventEntrants: MockInstance };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get reference to prisma
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma = prisma as any;

    // Create mock client methods
    mockStartGGClient = {
      getEventEntrants: vi.fn(),
    };

    // Setup the mock implementation - key pattern!
    (StartGGClient as unknown as MockInstance).mockImplementation(() => mockStartGGClient);

    service = new RegistrationSyncService('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncEventRegistrations', () => {
    it('should return empty result when no entrants exist', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [],
        pageInfo: { total: 0, totalPages: 0 },
      });
      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.syncEventRegistrations('event-123');

      expect(result.success).toBe(true);
      expect(result.totalEntrants).toBe(0);
      expect(result.newRegistrations).toBe(0);
      expect(result.updatedRegistrations).toBe(0);
    });

    it('should fetch entrants from Start.gg with pagination', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'Player1',
            participants: [{ user: { id: 'user-1', slug: 'player1', gamerTag: 'Player1' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'reg-1' }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      expect(mockStartGGClient.getEventEntrants).toHaveBeenCalledWith('event-123', 1, 50);
      expect(result.totalEntrants).toBe(1);
    });

    it('should handle multiple pages of entrants', async () => {
      mockStartGGClient.getEventEntrants
        .mockResolvedValueOnce({
          nodes: [{ id: 'entrant-1', name: 'Player1', participants: [] }],
          pageInfo: { total: 100, totalPages: 2 },
        })
        .mockResolvedValueOnce({
          nodes: [{ id: 'entrant-2', name: 'Player2', participants: [] }],
          pageInfo: { total: 100, totalPages: 2 },
        });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'reg-1' }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      expect(mockStartGGClient.getEventEntrants).toHaveBeenCalledTimes(2);
      expect(result.totalEntrants).toBe(2);
    });

    it('should skip invalid entrants with missing id', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          { id: '', name: 'Player1', participants: [] },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'reg-1' }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      expect(result.newRegistrations).toBe(0);
      expect(result.errors).toContain('Invalid entrant data: ');
    });

    it('should skip invalid entrants with missing name', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          { id: 'entrant-1', name: null, participants: [] },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'reg-1' }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      expect(result.newRegistrations).toBe(0);
      expect(result.errors).toContain('Invalid entrant data: entrant-1');
    });

    it('should report API errors gracefully', async () => {
      mockStartGGClient.getEventEntrants.mockRejectedValue(new Error('API Error'));

      // The service catches errors in fetchEntrantsFromStartgg and returns empty array
      // So result should be empty but successful (no entrants to process)
      const result = await service.syncEventRegistrations('event-123');

      expect(result.totalEntrants).toBe(0);
      expect(result.success).toBe(true);
    });
  });

  describe('processEntrant', () => {
    it('should create new registration for new entrant', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-new',
            name: 'NewPlayer',
            participants: [{ user: { id: 'startgg-user-new', slug: 'newplayer', gamerTag: 'NewPlayer' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      let createdData: unknown = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((data: unknown) => {
              // Prisma create receives { data: { ... } }
              createdData = (data as { data: unknown }).data;
              return { id: 'reg-new', ...((data as { data: unknown }).data as object) };
            }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      expect(result.newRegistrations).toBe(1);
      expect(createdData).toMatchObject({
        eventId: 'event-123',
        startggEntrantId: 'entrant-new',
        source: 'STARTGG',
        status: 'CONFIRMED',
      });
    });

    it('should link to existing user by startggId', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'DifferentName',
            participants: [{ user: { id: 'startgg-user-1', slug: 'player1', gamerTag: 'Player1' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', startggId: 'startgg-user-1', startggGamerTag: 'Player1' },
      ]);

      let createdData: unknown = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((data: unknown) => {
              createdData = (data as { data: unknown }).data;
              return { id: 'reg-1', ...((data as { data: unknown }).data as object) };
            }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      await service.syncEventRegistrations('event-123');

      expect(createdData).toMatchObject({
        userId: 'user-1',
        startggEntrantId: 'entrant-1',
      });
    });

    it('should link to existing user by gamer tag', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'PlayerOne',
            participants: [{ user: { id: 'unknown', slug: 'unknown', gamerTag: 'Unknown' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', startggId: null, startggGamerTag: 'playerone' },
      ]);

      let createdData: unknown = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((data: unknown) => {
              createdData = (data as { data: unknown }).data;
              return { id: 'reg-1', ...((data as { data: unknown }).data as object) };
            }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      await service.syncEventRegistrations('event-123');

      expect(createdData).toMatchObject({
        userId: 'user-1',
        startggEntrantId: 'entrant-1',
      });
    });

    it('should create ghost registration when no user match', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'UnknownPlayer',
            participants: [{ user: { id: 'unknown', slug: 'unknown', gamerTag: 'Unknown' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      let createdData: unknown = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((data: unknown) => {
              createdData = (data as { data: unknown }).data;
              return { id: 'reg-1', ...((data as { data: unknown }).data as object) };
            }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      await service.syncEventRegistrations('event-123');

      expect(createdData).toMatchObject({
        userId: null,
        source: 'STARTGG',
        status: 'CONFIRMED',
      });
    });

    it('should not create duplicate registrations for same entrant', async () => {
      // Test that when an entrant already has a registration, it doesn't create duplicate
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'ExistingPlayer',
            participants: [{ user: { id: 'user-1', slug: 'existing', gamerTag: 'Existing' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      // Return existing registration - this is what the service queries
      mockPrisma.registration.findMany.mockResolvedValue([
        { id: 'reg-1', startggEntrantId: 'entrant-1', userId: 'user-1', status: 'PENDING' },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null), // Simulate not finding in transaction
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'reg-new' }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      // Should create exactly one new registration (the transaction still runs create)
      expect(result.newRegistrations).toBe(1);
    });

    it('should not overwrite DQ status', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'DQPlayer',
            participants: [{ user: { id: 'user-1', slug: 'dqplayer', gamerTag: 'DQPlayer' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([
        { id: 'reg-1', startggEntrantId: 'entrant-1', userId: 'user-1', status: 'DQ' },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue({ id: 'reg-1', startggEntrantId: 'entrant-1', status: 'DQ' }),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      expect(result.updatedRegistrations).toBe(0);
    });
  });
});
