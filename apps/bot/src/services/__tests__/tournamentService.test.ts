import { describe, it, expect, beforeEach, vi, afterEach, type MockInstance } from 'vitest';
import { TournamentService } from '../tournamentService.js';

// Mock the database
vi.mock('@fightrise/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    tournament: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    event: {
      upsert: vi.fn(),
    },
    tournamentAdmin: {
      upsert: vi.fn(),
    },
    guildConfig: {
      upsert: vi.fn(),
    },
  },
  TournamentState: {
    CREATED: 'CREATED',
    REGISTRATION_OPEN: 'REGISTRATION_OPEN',
    REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
  AdminRole: {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MODERATOR: 'MODERATOR',
  },
}));

// Mock the StartGGClient
vi.mock('@fightrise/startgg-client', () => ({
  StartGGClient: vi.fn().mockImplementation(() => ({
    getTournament: vi.fn(),
    getTournamentsByOwner: vi.fn(),
  })),
}));

import { prisma } from '@fightrise/database';
import { StartGGClient } from '@fightrise/startgg-client';

describe('TournamentService', () => {
  let service: TournamentService;
  let mockStartGGClient: {
    getTournament: MockInstance;
    getTournamentsByOwner: MockInstance;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Get reference to the mocked client methods
    mockStartGGClient = {
      getTournament: vi.fn(),
      getTournamentsByOwner: vi.fn(),
    };

    // Setup the mock implementation
    (StartGGClient as unknown as MockInstance).mockImplementation(() => mockStartGGClient);

    service = new TournamentService('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeSlug', () => {
    it('should return slug as-is when already normalized', () => {
      expect(service.normalizeSlug('my-weekly-42')).toBe('my-weekly-42');
    });

    it('should strip "tournament/" prefix', () => {
      expect(service.normalizeSlug('tournament/my-weekly-42')).toBe('my-weekly-42');
    });

    it('should extract slug from full start.gg URL', () => {
      expect(service.normalizeSlug('https://start.gg/tournament/my-weekly-42')).toBe('my-weekly-42');
    });

    it('should extract slug from URL with www prefix', () => {
      expect(service.normalizeSlug('https://www.start.gg/tournament/my-weekly-42')).toBe('my-weekly-42');
    });

    it('should extract slug from URL with event path', () => {
      expect(service.normalizeSlug('https://start.gg/tournament/my-weekly-42/event/sf6')).toBe('my-weekly-42');
    });

    it('should handle http URLs', () => {
      expect(service.normalizeSlug('http://start.gg/tournament/my-weekly-42')).toBe('my-weekly-42');
    });

    it('should trim whitespace', () => {
      expect(service.normalizeSlug('  my-weekly-42  ')).toBe('my-weekly-42');
    });

    it('should handle URL without protocol', () => {
      expect(service.normalizeSlug('start.gg/tournament/my-weekly-42')).toBe('my-weekly-42');
    });
  });

  describe('setupTournament', () => {
    const mockSetupParams = {
      discordUserId: 'discord-user-123',
      discordGuildId: 'discord-guild-456',
      matchChannelId: 'channel-789',
      tournamentSlug: 'test-tournament',
    };

    const mockUser = {
      id: 'user-db-id',
      discordId: 'discord-user-123',
      startggId: 'startgg-user-id',
      startggToken: null,
    };

    const mockTournament = {
      id: 'startgg-tournament-id',
      name: 'Test Tournament',
      slug: 'test-tournament',
      startAt: Math.floor(Date.now() / 1000),
      endAt: Math.floor(Date.now() / 1000) + 86400,
      state: 1,
      events: [
        { id: 'event-1', name: 'SF6 Singles', numEntrants: 32, state: 'CREATED' },
        { id: 'event-2', name: 'Tekken 8', numEntrants: 16, state: 'CREATED' },
      ],
    };

    it('should return USER_NOT_LINKED error if user has no Start.gg account', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await service.setupTournament(mockSetupParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('USER_NOT_LINKED');
      }
    });

    it('should return USER_NOT_LINKED error if user exists but has no startggId', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        startggId: null,
      } as never);

      const result = await service.setupTournament(mockSetupParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('USER_NOT_LINKED');
      }
    });

    it('should return TOURNAMENT_NOT_FOUND error if tournament does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      mockStartGGClient.getTournament.mockResolvedValue(null);

      const result = await service.setupTournament(mockSetupParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOURNAMENT_NOT_FOUND');
      }
    });

    it('should successfully create tournament when all validations pass', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      mockStartGGClient.getTournament.mockResolvedValue(mockTournament);
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);
      const dbTournament = {
        ...mockTournament,
        startggId: mockTournament.id,
        startggSlug: 'test-tournament',
        discordGuildId: mockSetupParams.discordGuildId,
        discordChannelId: mockSetupParams.matchChannelId,
      };
      vi.mocked(prisma.tournament.upsert).mockResolvedValue(dbTournament as never);
      vi.mocked(prisma.event.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.tournamentAdmin.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.guildConfig.upsert).mockResolvedValue({} as never);

      const result = await service.setupTournament(mockSetupParams);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.isUpdate).toBe(false);
      }
    });

    it('should mark as update when tournament already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      mockStartGGClient.getTournament.mockResolvedValue(mockTournament);
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
        id: 'existing-tournament-id',
      } as never);
      const dbTournament = {
        id: 'existing-tournament-id',
        name: mockTournament.name,
        startggId: mockTournament.id,
        startggSlug: 'test-tournament',
        discordGuildId: mockSetupParams.discordGuildId,
        discordChannelId: mockSetupParams.matchChannelId,
        events: mockTournament.events,
      };
      vi.mocked(prisma.tournament.upsert).mockResolvedValue(dbTournament as never);
      vi.mocked(prisma.event.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.tournamentAdmin.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.guildConfig.upsert).mockResolvedValue({} as never);

      const result = await service.setupTournament(mockSetupParams);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.isUpdate).toBe(true);
      }
    });

    it('should create events for each tournament event', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      mockStartGGClient.getTournament.mockResolvedValue(mockTournament);
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);
      const dbTournament = {
        ...mockTournament,
        startggId: mockTournament.id,
        startggSlug: 'test-tournament',
        discordGuildId: mockSetupParams.discordGuildId,
        discordChannelId: mockSetupParams.matchChannelId,
      };
      vi.mocked(prisma.tournament.upsert).mockResolvedValue(dbTournament as never);
      vi.mocked(prisma.event.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.tournamentAdmin.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.guildConfig.upsert).mockResolvedValue({} as never);

      await service.setupTournament(mockSetupParams);

      expect(prisma.event.upsert).toHaveBeenCalledTimes(2);
    });

    it('should normalize slug before fetching tournament', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      mockStartGGClient.getTournament.mockResolvedValue(null);

      await service.setupTournament({
        ...mockSetupParams,
        tournamentSlug: 'https://start.gg/tournament/test-tournament/event/sf6',
      });

      expect(mockStartGGClient.getTournament).toHaveBeenCalledWith('test-tournament');
    });
  });

  describe('validateUserIsAdmin', () => {
    it('should return true if user has no OAuth token', async () => {
      const result = await service.validateUserIsAdmin(null, 'test-tournament');
      expect(result).toBe(true);
    });

    it('should return true if user owns the tournament', async () => {
      const userClientMock = {
        getTournamentsByOwner: vi.fn().mockResolvedValue({
          nodes: [{ slug: 'test-tournament' }],
        }),
      };
      (StartGGClient as unknown as MockInstance).mockImplementation(() => userClientMock);

      // Create new service to pick up new mock
      const testService = new TournamentService('test-api-key');
      const result = await testService.validateUserIsAdmin('user-token', 'test-tournament');

      expect(result).toBe(true);
    });

    it('should return false if user does not own the tournament', async () => {
      const userClientMock = {
        getTournamentsByOwner: vi.fn().mockResolvedValue({
          nodes: [{ slug: 'other-tournament' }],
        }),
        getTournament: vi.fn(),
      };
      (StartGGClient as unknown as MockInstance).mockImplementation(() => userClientMock);

      const testService = new TournamentService('test-api-key');
      const result = await testService.validateUserIsAdmin('user-token', 'test-tournament');

      expect(result).toBe(false);
    });
  });
});
