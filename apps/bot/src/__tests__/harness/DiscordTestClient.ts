/**
 * Discord test client for integration testing.
 * Provides an in-memory Discord.js client mock that can dispatch interactions
 * and track messages/threads without connecting to Discord.
 */

import { EventEmitter } from 'events';
import { Collection } from 'discord.js';
import type { Command, ExtendedClient } from '../../types.js';
import {
  MockChatInputInteraction,
  MockButtonInteraction,
  createMockChatInputInteraction,
  createMockButtonInteraction,
  MockChatInputInteractionOptions,
  MockButtonInteractionOptions,
} from './MockInteraction.js';
import {
  MockTextChannel,
  MockThreadChannel,
  createMockTextChannel,
  createMockThread,
  MockMessage,
} from './MockChannel.js';

export interface DiscordTestClientOptions {
  userId?: string;
  username?: string;
  guildId?: string;
  channelId?: string;
}

/**
 * Test client that simulates Discord.js client behavior.
 * Use this to test bot commands without a real Discord connection.
 *
 * Example usage:
 * ```ts
 * const testClient = new DiscordTestClient();
 *
 * // Register commands
 * testClient.registerCommand(myCommand);
 *
 * // Execute a command
 * const interaction = await testClient.executeCommand('mycommand', {
 *   optionName: 'value',
 * });
 *
 * // Assert on the response
 * expect(interaction.lastReply?.content).toBe('Expected response');
 * ```
 */
export class DiscordTestClient extends EventEmitter {
  commands: Collection<string, Command> = new Collection();
  channels: Map<string, MockTextChannel> = new Map();
  threads: Map<string, MockThreadChannel> = new Map();

  // Track all interactions for assertions
  interactions: (MockChatInputInteraction | MockButtonInteraction)[] = [];
  messages: MockMessage[] = [];

  // Default IDs
  userId: string;
  username: string;
  guildId: string;
  channelId: string;

  private interactionIdCounter = 0;

  constructor(options: DiscordTestClientOptions = {}) {
    super();
    this.userId = options.userId ?? 'user-123';
    this.username = options.username ?? 'TestUser';
    this.guildId = options.guildId ?? 'guild-123';
    this.channelId = options.channelId ?? 'channel-123';

    // Create default channel
    const defaultChannel = createMockTextChannel({
      id: this.channelId,
      guildId: this.guildId,
    });
    this.channels.set(this.channelId, defaultChannel);

    // Track messages from channels
    defaultChannel.on('messageSent', (message: MockMessage) => {
      this.messages.push(message);
      this.emit('messageSent', message);
    });

    // Track threads created from the default channel
    defaultChannel.on('threadCreated', (thread: MockThreadChannel) => {
      this.threads.set(thread.id, thread);
      thread.on('messageSent', (message: MockMessage) => {
        this.messages.push(message);
        this.emit('messageSent', message);
      });
      this.emit('threadCreated', thread);
    });
  }

  /**
   * Register a command with the test client.
   */
  registerCommand(command: Command): void {
    const name = command.data.name;
    this.commands.set(name, command);
  }

  /**
   * Register multiple commands at once.
   */
  registerCommands(commands: Command[]): void {
    commands.forEach((cmd) => this.registerCommand(cmd));
  }

  /**
   * Execute a slash command and return the interaction for assertions.
   */
  async executeCommand(
    commandName: string,
    options: Record<string, unknown> = {},
    interactionOptions: Partial<MockChatInputInteractionOptions> = {}
  ): Promise<MockChatInputInteraction> {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`Command "${commandName}" not found. Did you register it?`);
    }

    const channel = this.channels.get(this.channelId) ?? createMockTextChannel();

    const interaction = createMockChatInputInteraction({
      commandName,
      options: options as Record<string, string | number | boolean | null | undefined>,
      user: {
        id: this.userId,
        username: this.username,
      },
      member: {
        id: this.userId,
        guildId: this.guildId,
      },
      guild: {
        id: this.guildId,
      },
      channel,
      client: this.toExtendedClient(),
      ...interactionOptions,
    });

    this.interactions.push(interaction);
    this.emit('interactionCreate', interaction);

    // Execute the command
    await command.execute(interaction as unknown as Parameters<Command['execute']>[0]);

    return interaction;
  }

  /**
   * Simulate a button click and return the interaction for assertions.
   */
  async clickButton(
    customId: string,
    interactionOptions: Partial<MockButtonInteractionOptions> = {}
  ): Promise<MockButtonInteraction> {
    const channel = this.channels.get(this.channelId) ?? createMockTextChannel();

    const interaction = createMockButtonInteraction({
      customId,
      user: {
        id: this.userId,
        username: this.username,
      },
      member: {
        id: this.userId,
        guildId: this.guildId,
      },
      guild: {
        id: this.guildId,
      },
      channel,
      client: this.toExtendedClient(),
      ...interactionOptions,
    });

    this.interactions.push(interaction);
    this.emit('interactionCreate', interaction);

    return interaction;
  }

  /**
   * Create a new channel for testing.
   */
  createChannel(id?: string, name?: string): MockTextChannel {
    const channel = createMockTextChannel({
      id: id ?? `channel-${Date.now()}`,
      name: name ?? 'test-channel',
      guildId: this.guildId,
    });

    channel.on('messageSent', (message: MockMessage) => {
      this.messages.push(message);
      this.emit('messageSent', message);
    });

    channel.on('threadCreated', (thread: MockThreadChannel) => {
      this.threads.set(thread.id, thread);
      thread.on('messageSent', (message: MockMessage) => {
        this.messages.push(message);
        this.emit('messageSent', message);
      });
      this.emit('threadCreated', thread);
    });

    this.channels.set(channel.id, channel);
    return channel;
  }

  /**
   * Create a new thread for testing.
   */
  createThread(name: string, parentChannelId?: string): MockThreadChannel {
    const parentId = parentChannelId ?? this.channelId;
    const thread = createMockThread({
      name,
      parentId,
      guildId: this.guildId,
    });

    thread.on('messageSent', (message: MockMessage) => {
      this.messages.push(message);
      this.emit('messageSent', message);
    });

    this.threads.set(thread.id, thread);
    return thread;
  }

  /**
   * Get a channel by ID.
   */
  getChannel(id: string): MockTextChannel | undefined {
    return this.channels.get(id);
  }

  /**
   * Get a thread by ID.
   */
  getThread(id: string): MockThreadChannel | undefined {
    return this.threads.get(id);
  }

  /**
   * Clear all tracked state for test isolation.
   */
  reset(): void {
    this.interactions = [];
    this.messages = [];
    this.threads.clear();

    // Clear messages from channels
    this.channels.forEach((channel) => {
      channel.messages = [];
      channel.threads.clear();
    });
  }

  /**
   * Get all command replies from all interactions.
   */
  get allReplies(): unknown[] {
    return this.interactions.flatMap((interaction) => {
      if (interaction instanceof MockChatInputInteraction) {
        return interaction.replies;
      }
      return interaction.replies;
    });
  }

  /**
   * Get the last interaction.
   */
  get lastInteraction(): MockChatInputInteraction | MockButtonInteraction | null {
    return this.interactions.length > 0
      ? this.interactions[this.interactions.length - 1]
      : null;
  }

  /**
   * Get the last message sent to any channel/thread.
   */
  get lastMessage(): MockMessage | null {
    return this.messages.length > 0
      ? this.messages[this.messages.length - 1]
      : null;
  }

  /**
   * Convert to an ExtendedClient-like object for command execution.
   */
  toExtendedClient(): ExtendedClient {
    return {
      commands: this.commands,
      channels: {
        cache: this.channels,
        fetch: async (id: string) => this.channels.get(id),
      },
      guilds: {
        cache: new Map(),
      },
      user: {
        id: 'bot-123',
        username: 'TestBot',
        tag: 'TestBot#0000',
      },
    } as unknown as ExtendedClient;
  }
}

/**
 * Create a new test client instance.
 */
export function createDiscordTestClient(
  options: DiscordTestClientOptions = {}
): DiscordTestClient {
  return new DiscordTestClient(options);
}

/**
 * Helper to wait for an event to be emitted.
 */
export function waitForEvent<T>(
  emitter: EventEmitter,
  event: string,
  timeout = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event "${event}"`));
    }, timeout);

    emitter.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
