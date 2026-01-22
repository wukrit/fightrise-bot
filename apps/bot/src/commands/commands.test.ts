import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatInputCommandInteraction } from 'discord.js';

// Helper to create a mock interaction
function createMockInteraction(options: {
  commandName?: string;
  subcommand?: string;
  getString?: (name: string) => string | null;
} = {}) {
  const mockReply = vi.fn().mockResolvedValue(undefined);

  return {
    commandName: options.commandName || 'test',
    options: {
      getSubcommand: vi.fn().mockReturnValue(options.subcommand || 'default'),
      getString: options.getString || vi.fn().mockReturnValue(null),
    },
    reply: mockReply,
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
      });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('tournament/test'),
          ephemeral: true,
        })
      );
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
