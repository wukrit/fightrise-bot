import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatInputCommandInteraction } from 'discord.js';
import type { TournamentSetupResult } from '../services/tournamentService.js';

// Store the mock function so we can change its return value per test
const mockSetupTournament = vi.fn();

// Mock the tournament service for /tournament setup command
vi.mock('../services/tournamentService.js', () => ({
  getTournamentService: vi.fn(() => ({
    setupTournament: mockSetupTournament,
  })),
}));

// Mock prisma for database queries
vi.mock('@fightrise/database', () => ({
  prisma: {
    tournament: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    matchPlayer: {
      findMany: vi.fn().mockResolvedValue([]),
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
}));

// Helper to create a mock interaction
function createMockInteraction(options: {
  commandName?: string;
  subcommand?: string;
  getString?: (name: string) => string | null;
  getChannel?: (name: string) => { id: string } | null;
  guildId?: string | null;
} = {}) {
  const mockReply = vi.fn().mockResolvedValue(undefined);
  const mockDeferReply = vi.fn().mockResolvedValue(undefined);
  const mockEditReply = vi.fn().mockResolvedValue(undefined);

  return {
    commandName: options.commandName || 'test',
    guildId: options.guildId !== undefined ? options.guildId : 'guild-123',
    user: { id: 'user-123' },
    options: {
      getSubcommand: vi.fn().mockReturnValue(options.subcommand || 'default'),
      getString: options.getString || vi.fn().mockReturnValue(null),
      getChannel: options.getChannel || vi.fn().mockReturnValue(null),
    },
    reply: mockReply,
    deferReply: mockDeferReply,
    editReply: mockEditReply,
    replied: false,
    deferred: false,
  } as unknown as ChatInputCommandInteraction;
}

describe('Command Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return value
    mockSetupTournament.mockResolvedValue({
      success: false,
      error: { code: 'USER_NOT_LINKED', message: 'User not linked' },
    });
  });

  describe('/tournament', () => {
    // Mock tournament data for success scenarios
    const mockTournament = {
      id: 'tournament-123',
      name: 'Test Tournament',
      startggSlug: 'test-tournament',
      startAt: new Date(),
      events: [
        { id: 'event-1', name: 'SF6', numEntrants: 32 },
        { id: 'event-2', name: 'Tekken 8', numEntrants: 16 },
      ],
    };

    describe('setup subcommand', () => {
      it('should show success embed when setup succeeds (new tournament)', async () => {
        mockSetupTournament.mockResolvedValue({
          success: true,
          tournament: mockTournament,
          isUpdate: false,
        } as TournamentSetupResult);

        const { default: command } = await import('./tournament.js');
        const interaction = createMockInteraction({
          commandName: 'tournament',
          subcommand: 'setup',
          getString: (name: string) => (name === 'slug' ? 'test-tournament' : null),
          getChannel: (name: string) => (name === 'match-channel' ? { id: 'channel-123' } : null),
          guildId: 'guild-123',
        });

        await command.execute(interaction);

        expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.arrayContaining([
              expect.objectContaining({
                data: expect.objectContaining({
                  title: 'Tournament Configured',
                }),
              }),
            ]),
          })
        );
      });

      it('should show update embed when tournament already exists', async () => {
        mockSetupTournament.mockResolvedValue({
          success: true,
          tournament: mockTournament,
          isUpdate: true,
        } as TournamentSetupResult);

        const { default: command } = await import('./tournament.js');
        const interaction = createMockInteraction({
          commandName: 'tournament',
          subcommand: 'setup',
          getString: (name: string) => (name === 'slug' ? 'test-tournament' : null),
          getChannel: (name: string) => (name === 'match-channel' ? { id: 'channel-123' } : null),
          guildId: 'guild-123',
        });

        await command.execute(interaction);

        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.arrayContaining([
              expect.objectContaining({
                data: expect.objectContaining({
                  title: 'Tournament Updated',
                }),
              }),
            ]),
          })
        );
      });

      it('should show error when user not linked', async () => {
        mockSetupTournament.mockResolvedValue({
          success: false,
          error: { code: 'USER_NOT_LINKED', message: 'You haven\'t linked your Start.gg account yet.' },
        });

        const { default: command } = await import('./tournament.js');
        const interaction = createMockInteraction({
          commandName: 'tournament',
          subcommand: 'setup',
          getString: (name: string) => (name === 'slug' ? 'test-tournament' : null),
          getChannel: (name: string) => (name === 'match-channel' ? { id: 'channel-123' } : null),
          guildId: 'guild-123',
        });

        await command.execute(interaction);

        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('haven\'t linked'),
          })
        );
      });

      it('should show error when OAuth required', async () => {
        mockSetupTournament.mockResolvedValue({
          success: false,
          error: { code: 'OAUTH_REQUIRED', message: 'OAuth connection required.' },
        });

        const { default: command } = await import('./tournament.js');
        const interaction = createMockInteraction({
          commandName: 'tournament',
          subcommand: 'setup',
          getString: (name: string) => (name === 'slug' ? 'test-tournament' : null),
          getChannel: (name: string) => (name === 'match-channel' ? { id: 'channel-123' } : null),
          guildId: 'guild-123',
        });

        await command.execute(interaction);

        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('OAuth connection required'),
          })
        );
      });

      it('should show error when tournament not found', async () => {
        mockSetupTournament.mockResolvedValue({
          success: false,
          error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found.' },
        });

        const { default: command } = await import('./tournament.js');
        const interaction = createMockInteraction({
          commandName: 'tournament',
          subcommand: 'setup',
          getString: (name: string) => (name === 'slug' ? 'invalid-tournament' : null),
          getChannel: (name: string) => (name === 'match-channel' ? { id: 'channel-123' } : null),
          guildId: 'guild-123',
        });

        await command.execute(interaction);

        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('Tournament not found'),
          })
        );
      });

      it('should show error when user is not admin', async () => {
        mockSetupTournament.mockResolvedValue({
          success: false,
          error: { code: 'NOT_ADMIN', message: 'Permission denied.' },
        });

        const { default: command } = await import('./tournament.js');
        const interaction = createMockInteraction({
          commandName: 'tournament',
          subcommand: 'setup',
          getString: (name: string) => (name === 'slug' ? 'test-tournament' : null),
          getChannel: (name: string) => (name === 'match-channel' ? { id: 'channel-123' } : null),
          guildId: 'guild-123',
        });

        await command.execute(interaction);

        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('Permission denied'),
          })
        );
      });

      it('should show error when command used outside a server', async () => {
        const { default: command } = await import('./tournament.js');
        const interaction = createMockInteraction({
          commandName: 'tournament',
          subcommand: 'setup',
          getString: (name: string) => (name === 'slug' ? 'test-tournament' : null),
          getChannel: (name: string) => (name === 'match-channel' ? { id: 'channel-123' } : null),
          guildId: null, // Not in a server
        });

        await command.execute(interaction);

        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('only be used in a server'),
          })
        );
      });
    });

    describe('status subcommand', () => {
      it('should defer reply and respond with no tournament message when none exists', async () => {
        const { default: command } = await import('./tournament.js');
        const interaction = createMockInteraction({
          commandName: 'tournament',
          subcommand: 'status',
        });

        await command.execute(interaction);

        expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('No tournament found'),
          })
        );
      });
    });
  });

  describe('/register', () => {
    it('should respond with pending implementation message', async () => {
      const { default: command } = await import('./register.js');
      const interaction = createMockInteraction({ commandName: 'register' });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('pending implementation'),
          ephemeral: true,
        })
      );
    });
  });

  describe('/link-startgg', () => {
    it('should respond with pending implementation message', async () => {
      const { default: command } = await import('./link-startgg.js');
      const interaction = createMockInteraction({ commandName: 'link-startgg' });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('pending implementation'),
          ephemeral: true,
        })
      );
    });
  });

  describe('/my-matches', () => {
    it('should respond with not registered message when user not found', async () => {
      const { default: command } = await import('./my-matches.js');
      const interaction = createMockInteraction({ commandName: 'my-matches' });

      await command.execute(interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not registered'),
        })
      );
    });
  });

  describe('/checkin', () => {
    it('should respond with pending implementation message', async () => {
      const { default: command } = await import('./checkin.js');
      const interaction = createMockInteraction({ commandName: 'checkin' });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('pending implementation'),
          ephemeral: true,
        })
      );
    });
  });

  describe('/report', () => {
    it('should respond with pending implementation message', async () => {
      const { default: command } = await import('./report.js');
      const interaction = createMockInteraction({ commandName: 'report' });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('pending implementation'),
          ephemeral: true,
        })
      );
    });
  });
});
