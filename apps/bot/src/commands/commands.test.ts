import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatInputCommandInteraction } from 'discord.js';

// Mock the tournament service for /tournament setup command
vi.mock('../services/tournamentService.js', () => ({
  getTournamentService: vi.fn(() => ({
    setupTournament: vi.fn().mockResolvedValue({
      success: false,
      error: { code: 'USER_NOT_LINKED', message: 'User not linked' },
    }),
  })),
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
  });

  describe('/tournament', () => {
    it('should respond to setup subcommand with slug', async () => {
      const { default: command } = await import('./tournament.js');
      const interaction = createMockInteraction({
        commandName: 'tournament',
        subcommand: 'setup',
        getString: (name: string) => (name === 'slug' ? 'tournament/test' : null),
        getChannel: (name: string) => (name === 'match-channel' ? { id: 'channel-123' } : null),
        guildId: 'guild-123',
      });

      await command.execute(interaction);

      // Should defer reply first, then edit with result
      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      expect(interaction.editReply).toHaveBeenCalled();
    });

    it('should respond to status subcommand', async () => {
      const { default: command } = await import('./tournament.js');
      const interaction = createMockInteraction({
        commandName: 'tournament',
        subcommand: 'status',
      });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('pending implementation'),
          ephemeral: true,
        })
      );
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
    it('should respond with pending implementation message', async () => {
      const { default: command } = await import('./my-matches.js');
      const interaction = createMockInteraction({ commandName: 'my-matches' });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('pending implementation'),
          ephemeral: true,
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
