import { describe, it, expect, beforeEach, vi, afterEach, type MockInstance } from 'vitest';
import { RegistrationSyncService } from '../registrationSyncService.js';
import { Client, EmbedBuilder, Colors, ChannelType, GuildTextBasedChannel } from 'discord.js';

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
  EventState: {
    CREATED: 'CREATED',
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
  },
  StartggSyncStatus: {
    NOT_SYNCED: 'NOT_SYNCED',
    PENDING: 'PENDING',
    SYNCED: 'SYNCED',
    FAILED: 'FAILED',
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

// Mock discord.js
vi.mock('discord.js', () => {
  const createMockEmbed = () => {
    const embed: Record<string, unknown> = {};
    return new Proxy(embed, {
      get(target, prop) {
        if (prop === 'then') return undefined;
        return vi.fn().mockReturnThis();
      },
    });
  };
  return {
    Client: vi.fn().mockImplementation(() => ({
      channels: {
        fetch: vi.fn(),
      },
    })),
    EmbedBuilder: vi.fn(createMockEmbed),
    Colors: {
      Green: 0x00ff00,
    },
    ChannelType: {
      GuildText: 0,
    },
  };
});

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
            participants: [{ user: { id: 'user-1', slug: 'player1', name: 'Player1' } }],
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
      // Mock event fetch outside transaction
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });
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
      // Mock event fetch outside transaction
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });
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
            participants: [{ user: { id: 'startgg-user-new', slug: 'newplayer', name: 'NewPlayer' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      // Mock event fetch outside transaction
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

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
            participants: [{ user: { id: 'startgg-user-1', slug: 'player1', name: 'Player1' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', startggId: 'startgg-user-1', startggGamerTag: 'Player1' },
      ]);
      // Mock event fetch outside transaction
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

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
            participants: [{ user: { id: 'unknown', slug: 'unknown', name: 'Unknown' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', startggId: null, startggGamerTag: 'playerone' },
      ]);
      // Mock event fetch outside transaction
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

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
            participants: [{ user: { id: 'unknown', slug: 'unknown', name: 'Unknown' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      // Mock event fetch outside transaction
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

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
      // With batch implementation, uses prefetched regMap to detect existing registrations
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'ExistingPlayer',
            participants: [{ user: { id: 'user-1', slug: 'existing', name: 'Existing' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      // Return existing registration - this is what the service queries
      mockPrisma.registration.findMany.mockResolvedValue([
        { id: 'reg-1', startggEntrantId: 'entrant-1', userId: 'user-1', status: 'PENDING' },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([]);
      // Mock event fetch outside transaction
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

      // Mock transaction - batch implementation only calls create/updateMany
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            create: vi.fn().mockResolvedValue({ id: 'reg-new' }),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      // Should UPDATE the existing registration, not create a new one
      expect(result.newRegistrations).toBe(0);
      expect(result.updatedRegistrations).toBe(1);
    });

    it('should not overwrite DQ status', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'DQPlayer',
            participants: [{ user: { id: 'user-1', slug: 'dqplayer', name: 'DQPlayer' } }],
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

  describe('notifyNewRegistrations', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockDiscordClient: any;

    beforeEach(() => {
      mockDiscordClient = {
        channels: {
          fetch: vi.fn(),
        },
      };
    });

    it('should send Discord message when new registrations added', async () => {
      // Mock event with Discord channel
      mockPrisma.event.findUnique.mockResolvedValue({
        id: 'event-123',
        name: 'Test Event',
        tournament: {
          discordChannelId: 'channel-123',
        },
      });

      // Mock the Discord channel
      const mockChannel = {
        send: vi.fn().mockResolvedValue(undefined),
        isSendable: vi.fn().mockReturnValue(true),
      };
      mockDiscordClient.channels.fetch.mockResolvedValue(mockChannel);

      // Call notifyNewRegistrations directly
      await service.notifyNewRegistrations('event-123', 5, mockDiscordClient);

      // Verify channel was fetched
      expect(mockDiscordClient.channels.fetch).toHaveBeenCalledWith('channel-123');

      // Verify message was sent
      expect(mockChannel.send).toHaveBeenCalled();
    });

    it('should not send message when no new registrations', async () => {
      const result = await service.notifyNewRegistrations('event-123', 0, mockDiscordClient);

      // Should return early without fetching channel
      expect(mockDiscordClient.channels.fetch).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle missing Discord client gracefully', async () => {
      const result = await service.notifyNewRegistrations('event-123', 5, undefined);

      // Should return early without errors
      expect(result).toBeUndefined();
    });

    it('should handle Discord channel fetch fails gracefully', async () => {
      mockDiscordClient.channels.fetch.mockResolvedValue(null);

      // Should not throw - errors are caught internally
      const result = await service.notifyNewRegistrations('event-123', 5, mockDiscordClient);

      expect(result).toBeUndefined();
    });

    it('should handle channel not sendable gracefully', async () => {
      const mockChannel = {
        send: vi.fn(),
        isSendable: vi.fn().mockReturnValue(false),
      };
      mockDiscordClient.channels.fetch.mockResolvedValue(mockChannel);

      // Should not throw - errors are caught internally
      const result = await service.notifyNewRegistrations('event-123', 5, mockDiscordClient);

      expect(result).toBeUndefined();
    });

    it('should handle missing discordChannelId gracefully', async () => {
      // Mock event without Discord channel
      mockPrisma.event.findUnique.mockResolvedValue({
        id: 'event-123',
        name: 'Test Event',
        tournament: {
          discordChannelId: null,
        },
      });

      // Should not throw - errors are caught internally
      const result = await service.notifyNewRegistrations('event-123', 5, mockDiscordClient);

      expect(result).toBeUndefined();
    });
  });

  describe('syncEventRegistrations - edge cases', () => {
    it('should handle event not found in database', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          { id: 'entrant-1', name: 'Player1', participants: [] },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      // Event not found
      mockPrisma.event.findUnique.mockResolvedValue(null);

      const result = await service.syncEventRegistrations('event-not-found');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Fatal error during sync: Event not found: event-not-found');
    });

    it('should handle user with only partial startgg data (no gamerTag)', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'Player1',
            participants: [{ user: { id: 'startgg-user-1', slug: 'player1', name: null } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      // User has startggId but no gamerTag
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', startggId: 'startgg-user-1', startggGamerTag: null },
      ]);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((data: unknown) => {
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

      const result = await service.syncEventRegistrations('event-123');

      // Should create ghost registration since gamerTag matching won't work
      expect(result.newRegistrations).toBe(1);
    });

    it('should handle entrant with no participants', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          { id: 'entrant-1', name: 'Player1', participants: [] },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((data: unknown) => {
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

      const result = await service.syncEventRegistrations('event-123');

      // Should still create registration using entrant name
      expect(result.newRegistrations).toBe(1);
    });

    it('should handle multiple participants per entrant (takes first)', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'TeamPlayer',
            participants: [
              { user: { id: 'startgg-user-1', slug: 'player1', name: 'Player1' } },
              { user: { id: 'startgg-user-2', slug: 'player2', name: 'Player2' } },
            ],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

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

      // Should link to first participant
      expect(createdData).toMatchObject({
        userId: null, // No matching user in DB, so ghost registration
        startggEntrantId: 'entrant-1',
      });
    });

    it('should not overwrite confirmed status with pending', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'ConfirmedPlayer',
            participants: [{ user: { id: 'user-1', slug: 'confirmed', name: 'Confirmed' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      // Existing registration is already CONFIRMED
      mockPrisma.registration.findMany.mockResolvedValue([
        { id: 'reg-1', startggEntrantId: 'entrant-1', userId: 'user-1', status: 'CONFIRMED' },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          registration: {
            findUnique: vi.fn().mockResolvedValue({ id: 'reg-1', status: 'CONFIRMED' }),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          event: {
            findUnique: vi.fn().mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.syncEventRegistrations('event-123');

      // Should update (confirm) the registration but count as 1 update
      expect(result.updatedRegistrations).toBe(1);
    });

    it('should handle database transaction errors gracefully', async () => {
      mockStartGGClient.getEventEntrants.mockResolvedValue({
        nodes: [
          {
            id: 'entrant-1',
            name: 'Player1',
            participants: [{ user: { id: 'user-1', slug: 'player1', name: 'Player1' } }],
          },
        ],
        pageInfo: { total: 1, totalPages: 1 },
      });

      mockPrisma.registration.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-123', tournamentId: 'tournament-1' });

      // Transaction fails
      mockPrisma.$transaction.mockRejectedValue(new Error('Database connection error'));

      const result = await service.syncEventRegistrations('event-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Fatal error during sync: Database connection error');
    });
  });
});
