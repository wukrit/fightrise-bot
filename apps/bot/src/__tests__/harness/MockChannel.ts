/**
 * Mock Discord.js channel and thread implementations for testing.
 * These provide in-memory implementations of channel operations.
 */

import { EventEmitter } from 'events';
import type { ThreadChannel, TextChannel, ChannelType } from 'discord.js';

export interface MockMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    bot: boolean;
  };
  embeds: unknown[];
  components: unknown[];
  createdAt: Date;
  channelId: string;
  guildId: string | null;
}

export interface MockThreadOptions {
  id?: string;
  name?: string;
  parentId?: string;
  guildId?: string;
  archived?: boolean;
  locked?: boolean;
}

/**
 * Mock thread channel for testing thread creation and messaging.
 */
export class MockThreadChannel extends EventEmitter {
  id: string;
  name: string;
  parentId: string;
  guildId: string;
  type: ChannelType.PublicThread = 11 as ChannelType.PublicThread;
  archived: boolean;
  locked: boolean;
  messages: MockMessage[] = [];
  members: Map<string, { id: string }> = new Map();

  private messageIdCounter = 0;

  constructor(options: MockThreadOptions = {}) {
    super();
    this.id = options.id ?? `thread-${Date.now()}`;
    this.name = options.name ?? 'Test Thread';
    this.parentId = options.parentId ?? 'channel-123';
    this.guildId = options.guildId ?? 'guild-123';
    this.archived = options.archived ?? false;
    this.locked = options.locked ?? false;
  }

  async send(options: string | { content?: string; embeds?: unknown[]; components?: unknown[] }): Promise<MockMessage> {
    const content = typeof options === 'string' ? options : options.content ?? '';
    const embeds = typeof options === 'string' ? [] : options.embeds ?? [];
    const components = typeof options === 'string' ? [] : options.components ?? [];

    const message: MockMessage = {
      id: `msg-${++this.messageIdCounter}`,
      content,
      author: { id: 'bot-123', username: 'TestBot', bot: true },
      embeds,
      components,
      createdAt: new Date(),
      channelId: this.id,
      guildId: this.guildId,
    };

    this.messages.push(message);
    this.emit('messageSent', message);

    return message;
  }

  async setArchived(archived: boolean): Promise<this> {
    this.archived = archived;
    return this;
  }

  async setLocked(locked: boolean): Promise<this> {
    this.locked = locked;
    return this;
  }

  async setName(name: string): Promise<this> {
    this.name = name;
    return this;
  }

  async delete(): Promise<void> {
    this.emit('deleted');
  }

  get lastMessage(): MockMessage | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  isThread(): this is MockThreadChannel {
    return true;
  }

  toJSON(): Partial<ThreadChannel> {
    return {
      id: this.id,
      name: this.name,
      parentId: this.parentId,
      guildId: this.guildId,
      type: this.type,
    } as Partial<ThreadChannel>;
  }
}

export interface MockTextChannelOptions {
  id?: string;
  name?: string;
  guildId?: string;
}

/**
 * Mock text channel for testing channel operations.
 */
export class MockTextChannel extends EventEmitter {
  id: string;
  name: string;
  guildId: string;
  type: ChannelType.GuildText = 0 as ChannelType.GuildText;
  messages: MockMessage[] = [];
  threads: Map<string, MockThreadChannel> = new Map();

  private messageIdCounter = 0;
  private threadIdCounter = 0;

  constructor(options: MockTextChannelOptions = {}) {
    super();
    this.id = options.id ?? `channel-${Date.now()}`;
    this.name = options.name ?? 'test-channel';
    this.guildId = options.guildId ?? 'guild-123';
  }

  async send(options: string | { content?: string; embeds?: unknown[]; components?: unknown[] }): Promise<MockMessage> {
    const content = typeof options === 'string' ? options : options.content ?? '';
    const embeds = typeof options === 'string' ? [] : options.embeds ?? [];
    const components = typeof options === 'string' ? [] : options.components ?? [];

    const message: MockMessage = {
      id: `msg-${++this.messageIdCounter}`,
      content,
      author: { id: 'bot-123', username: 'TestBot', bot: true },
      embeds,
      components,
      createdAt: new Date(),
      channelId: this.id,
      guildId: this.guildId,
    };

    this.messages.push(message);
    this.emit('messageSent', message);

    return message;
  }

  async createThread(options: {
    name: string;
    autoArchiveDuration?: number;
    type?: ChannelType;
    startMessage?: unknown;
    reason?: string;
  }): Promise<MockThreadChannel> {
    const thread = new MockThreadChannel({
      id: `thread-${++this.threadIdCounter}`,
      name: options.name,
      parentId: this.id,
      guildId: this.guildId,
    });

    this.threads.set(thread.id, thread);
    this.emit('threadCreated', thread);

    return thread;
  }

  get lastMessage(): MockMessage | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  isTextBased(): boolean {
    return true;
  }

  isThread(): boolean {
    return false;
  }

  toJSON(): Partial<TextChannel> {
    return {
      id: this.id,
      name: this.name,
      guildId: this.guildId,
      type: this.type,
    } as Partial<TextChannel>;
  }
}

/**
 * Factory function to create a mock thread.
 */
export function createMockThread(options: MockThreadOptions = {}): MockThreadChannel {
  return new MockThreadChannel(options);
}

/**
 * Factory function to create a mock text channel.
 */
export function createMockTextChannel(options: MockTextChannelOptions = {}): MockTextChannel {
  return new MockTextChannel(options);
}
