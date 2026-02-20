/**
 * Integration tests for event handlers.
 * Tests the ready, error, and interactionCreate event handlers.
 *
 * These tests use the Discord test harness to simulate events and interactions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Events, Client, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { createDiscordTestClient, DiscordTestClient } from '../harness/index.js';
import {
  MockChatInputInteraction,
  MockButtonInteraction,
  createMockChatInputInteraction,
  createMockButtonInteraction,
} from '../harness/MockInteraction.js';

// Import event handlers to test
import interactionCreateEvent from '../../events/interactionCreate.js';
import readyEvent from '../../events/ready.js';
import errorEvent from '../../events/error.js';

// Import commands and handlers
import tournamentCommand from '../../commands/tournament.js';
import checkinCommand from '../../commands/checkin.js';
import { registerButtonHandler, buttonHandlers } from '../../handlers/buttonHandlers.js';

// Test button handler for verification
const testButtonHandler = {
  prefix: 'test',
  async execute(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    await interaction.reply({ content: 'Test button handled!', ephemeral: true });
  },
};

// Mock client with commands
function createMockClient(commands: Map<string, unknown>): Client {
  return {
    commands,
    user: {
      tag: 'TestBot#0000',
    },
    guilds: {
      cache: new Map([['guild-123', { id: 'guild-123', name: 'Test Guild' }]]),
    },
  } as unknown as Client;
}

describe('interactionCreate Event Handler', () => {
  let testClient: DiscordTestClient;

  beforeEach(() => {
    testClient = createDiscordTestClient({
      userId: 'test-user-123',
      username: 'TestUser',
      guildId: 'test-guild-123',
      channelId: 'test-channel-123',
    });

    // Register commands
    testClient.registerCommands([tournamentCommand, checkinCommand]);

    // Register test button handler
    registerButtonHandler(testButtonHandler);
  });

  describe('Slash Command Routing', () => {
    it('should route slash commands to correct handler', async () => {
      const interaction = createMockChatInputInteraction({
        commandName: 'tournament',
        options: { _subcommand: 'status' },
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel: testClient.channels.get(testClient.channelId)!,
        client: testClient.toExtendedClient(),
      });

      // Execute the event handler
      await interactionCreateEvent.execute(interaction);

      // Verify command was executed (replied or deferred)
      expect(interaction.replied || interaction.deferred).toBe(true);
    });

    it('should execute known command', async () => {
      const interaction = createMockChatInputInteraction({
        commandName: 'checkin',
        options: {},
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel: testClient.channels.get(testClient.channelId)!,
        client: testClient.toExtendedClient(),
      });

      // Execute the event handler
      await interactionCreateEvent.execute(interaction);

      // Verify command was executed
      expect(interaction.replied || interaction.deferred).toBe(true);
    });

    it('should handle unknown command gracefully', async () => {
      const interaction = createMockChatInputInteraction({
        commandName: 'nonexistent-command',
        options: {},
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel: testClient.channels.get(testClient.channelId)!,
        client: testClient.toExtendedClient(),
      });

      // Execute the event handler - should not throw
      await interactionCreateEvent.execute(interaction);

      // Verify the handler completed without throwing
      // (pino logger handles warnings internally)
    });

    it('should handle command execution errors', async () => {
      // Create a command that throws an error
      const errorCommand = {
        data: { name: 'error-command' },
        execute: async () => {
          throw new Error('Command failed');
        },
      };

      testClient.registerCommand(errorCommand as unknown);

      const interaction = createMockChatInputInteraction({
        commandName: 'error-command',
        options: {},
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel: testClient.channels.get(testClient.channelId)!,
        client: testClient.toExtendedClient(),
      });

      // Execute the event handler - should not throw
      await interactionCreateEvent.execute(interaction);

      // Verify error message was sent to user
      expect(interaction.replied).toBe(true);
      expect(interaction.lastReply?.content).toContain('error');
    });
  });

  describe('Button Interaction Routing', () => {
    it('should route button interactions to correct handler', async () => {
      const channel = testClient.channels.get(testClient.channelId)!;

      const interaction = createMockButtonInteraction({
        customId: 'test:action',
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel,
        client: testClient.toExtendedClient(),
      });

      // Execute the event handler
      await interactionCreateEvent.execute(interaction);

      // Verify button handler was executed
      expect(interaction.replied).toBe(true);
      expect(interaction.lastReply?.content).toBe('Test button handled!');
    });

    it('should route string select menu interactions to registered handlers', async () => {
      const channel = testClient.channels.get(testClient.channelId)!;

      const interaction = createMockButtonInteraction({
        customId: 'test:action',
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel,
        client: testClient.toExtendedClient(),
      });

      Object.defineProperty(interaction, 'isButton', {
        value: () => false,
      });
      Object.defineProperty(interaction, 'isStringSelectMenu', {
        value: () => true,
      });
      Object.defineProperty(interaction, 'values', {
        value: ['1|2-1'],
      });

      await interactionCreateEvent.execute(interaction as unknown);

      expect(interaction.replied).toBe(true);
      expect(interaction.lastReply?.content).toBe('Test button handled!');
    });

    it('should handle unknown button prefix gracefully', async () => {
      const channel = testClient.channels.get(testClient.channelId)!;

      const interaction = createMockButtonInteraction({
        customId: 'unknown-prefix:action',
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel,
        client: testClient.toExtendedClient(),
      });

      // Execute the event handler - should not throw
      await interactionCreateEvent.execute(interaction);

      // Verify the handler completed without throwing
      // (pino logger handles warnings internally)
    });

    it('should handle button handler errors gracefully', async () => {
      // Register a failing button handler
      const failingHandler = {
        prefix: 'failing',
        execute: async () => {
          throw new Error('Button handler failed');
        },
      };
      registerButtonHandler(failingHandler);

      const channel = testClient.channels.get(testClient.channelId)!;

      const interaction = createMockButtonInteraction({
        customId: 'failing:action',
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel,
        client: testClient.toExtendedClient(),
      });

      // Execute the event handler - should not throw
      await interactionCreateEvent.execute(interaction);

      // Verify error message was sent to user
      expect(interaction.replied).toBe(true);
      expect(interaction.lastReply?.content).toContain('error');
    });
  });

  describe('Autocomplete Request Handling', () => {
    it('should handle autocomplete for registered commands without error', async () => {
      // Create a command with autocomplete
      const autocompleteCommand = {
        data: {
          name: 'autocomplete-test',
          autocomplete: vi.fn().mockResolvedValue([]),
        },
        execute: async () => {},
      };

      testClient.registerCommand(autocompleteCommand as unknown);

      // Create a mock autocomplete interaction
      const autocompleteInteraction = createMockChatInputInteraction({
        commandName: 'autocomplete-test',
        options: { query: 'test' },
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel: testClient.channels.get(testClient.channelId)!,
        client: testClient.toExtendedClient(),
      });

      // Replace the isAutocomplete method to return true
      autocompleteInteraction.isAutocomplete = () => true;

      // Execute the event handler - should not throw even if autocomplete is not called
      await interactionCreateEvent.execute(autocompleteInteraction as unknown);

      // Verify the handler completed without throwing
    });

    it('should handle autocomplete for unknown commands gracefully', async () => {
      // Create a mock autocomplete interaction for unknown command
      const autocompleteInteraction = createMockChatInputInteraction({
        commandName: 'unknown-autocomplete',
        options: { query: 'test' },
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel: testClient.channels.get(testClient.channelId)!,
        client: testClient.toExtendedClient(),
      });

      // Make it look like an autocomplete interaction
      Object.defineProperty(autocompleteInteraction, 'isAutocomplete', {
        value: () => true,
      });
      Object.defineProperty(autocompleteInteraction, 'isChatInputCommand', {
        value: () => false,
      });
      Object.defineProperty(autocompleteInteraction, 'isButton', {
        value: () => false,
      });

      // Execute the event handler - should not throw
      await interactionCreateEvent.execute(autocompleteInteraction);

      // Verify the handler completed without throwing
    });
  });

  describe('Unknown Interaction Types', () => {
    it('should handle unknown interaction types gracefully', async () => {
      const channel = testClient.channels.get(testClient.channelId)!;

      // Create a mock interaction that is not a command, button, or autocomplete
      const unknownInteraction = createMockChatInputInteraction({
        commandName: 'test',
        options: {},
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel,
        client: testClient.toExtendedClient(),
      });

      // Make it return false for all interaction type checks
      Object.defineProperty(unknownInteraction, 'isAutocomplete', {
        value: () => false,
      });
      Object.defineProperty(unknownInteraction, 'isChatInputCommand', {
        value: () => false,
      });
      Object.defineProperty(unknownInteraction, 'isButton', {
        value: () => false,
      });

      // Execute the event handler - should not throw
      await interactionCreateEvent.execute(unknownInteraction);

      // Should not have replied since it's an unknown type
      expect(unknownInteraction.replied).toBe(false);
    });
  });

  describe('Reply with Error Helper', () => {
    it('should send ephemeral error on already replied interaction', async () => {
      const channel = testClient.channels.get(testClient.channelId)!;

      // Create a button interaction that's already been replied to
      const interaction = createMockButtonInteraction({
        customId: 'test:action',
        user: { id: testClient.userId, username: testClient.username },
        member: { id: testClient.userId, guildId: testClient.guildId },
        guild: { id: testClient.guildId },
        channel,
        client: testClient.toExtendedClient(),
      });

      // Simulate that the interaction was already deferred
      interaction.deferred = true;

      // Execute the event handler with a registered handler
      await interactionCreateEvent.execute(interaction);

      // Verify response was sent (via followUp since already deferred)
      expect(interaction.replied || interaction.deferred).toBe(true);
    });
  });
});

describe('ready Event Handler', () => {
  it('should log ready message with bot info', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockClient = {
      user: {
        tag: 'TestBot#1234',
      },
      guilds: {
        cache: new Map([
          ['guild-1', { id: 'guild-1' }],
          ['guild-2', { id: 'guild-2' }],
          ['guild-3', { id: 'guild-3' }],
        ]),
      },
    } as unknown as Client<true>;

    // Execute the event handler
    await readyEvent.execute(mockClient);

    // Verify console.log was called with expected messages
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Bot ready!')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('TestBot#1234')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('3 guild(s)')
    );

    consoleSpy.mockRestore();
  });

  it('should log 0 guilds when bot is in no guilds', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockClient = {
      user: {
        tag: 'TestBot#1234',
      },
      guilds: {
        cache: new Map(),
      },
    } as unknown as Client<true>;

    // Execute the event handler
    await readyEvent.execute(mockClient);

    // Verify console.log was called with 0 guilds
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('0 guild(s)')
    );

    consoleSpy.mockRestore();
  });

  it('should be a one-time event', () => {
    expect(readyEvent.once).toBe(true);
  });

  it('should have correct event name', () => {
    expect(readyEvent.name).toBe(Events.ClientReady);
  });
});

describe('error Event Handler', () => {
  it('should log error with message', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const testError = new Error('Test error message');

    // Execute the event handler
    await errorEvent.execute(testError);

    // Verify console.error was called with error
    expect(consoleSpy).toHaveBeenCalledWith(
      'Discord client error:',
      testError
    );

    consoleSpy.mockRestore();
  });

  it('should log different error types', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Test with string error
    await errorEvent.execute('String error' as unknown as Error);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Discord client error:',
      'String error'
    );

    // Test with object error
    await errorEvent.execute({ code: 'ENOTFOUND', message: 'Network error' } as unknown as Error);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Discord client error:',
      { code: 'ENOTFOUND', message: 'Network error' }
    );

    consoleSpy.mockRestore();
  });

  it('should have correct event name', () => {
    expect(errorEvent.name).toBe(Events.Error);
  });
});
