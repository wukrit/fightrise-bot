/**
 * Mock Discord.js interaction implementations for testing.
 * These simulate command and button interactions without a real Discord connection.
 */

import { EventEmitter } from 'events';
import type {
  ChatInputCommandInteraction,
  ButtonInteraction,
  CommandInteractionOptionResolver,
  User,
  GuildMember,
  Guild,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
} from 'discord.js';
import { MockTextChannel, MockThreadChannel, MockMessage } from './MockChannel.js';

// ============================================
// Mock User
// ============================================

export interface MockUserOptions {
  id?: string;
  username?: string;
  discriminator?: string;
  avatar?: string | null;
  bot?: boolean;
}

export function createMockUser(options: MockUserOptions = {}): User {
  return {
    id: options.id ?? `user-${Date.now()}`,
    username: options.username ?? 'TestUser',
    discriminator: options.discriminator ?? '0001',
    avatar: options.avatar ?? null,
    bot: options.bot ?? false,
    tag: `${options.username ?? 'TestUser'}#${options.discriminator ?? '0001'}`,
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
    toString: () => `<@${options.id ?? 'user-123'}>`,
  } as unknown as User;
}

// ============================================
// Mock Guild Member
// ============================================

export interface MockGuildMemberOptions {
  id?: string;
  user?: User;
  nickname?: string | null;
  roles?: string[];
  guildId?: string;
}

export function createMockGuildMember(options: MockGuildMemberOptions = {}): GuildMember {
  const user = options.user ?? createMockUser({ id: options.id });
  return {
    id: user.id,
    user,
    nickname: options.nickname ?? null,
    displayName: options.nickname ?? user.username,
    roles: {
      cache: new Map(options.roles?.map((id) => [id, { id }]) ?? []),
    },
    guild: { id: options.guildId ?? 'guild-123' },
    toString: () => `<@${user.id}>`,
  } as unknown as GuildMember;
}

// ============================================
// Mock Guild
// ============================================

export interface MockGuildOptions {
  id?: string;
  name?: string;
  ownerId?: string;
}

export function createMockGuild(options: MockGuildOptions = {}): Guild {
  return {
    id: options.id ?? 'guild-123',
    name: options.name ?? 'Test Guild',
    ownerId: options.ownerId ?? 'owner-123',
    channels: {
      cache: new Map(),
      fetch: async () => new Map(),
    },
    members: {
      cache: new Map(),
      fetch: async (id: string) => createMockGuildMember({ id }),
    },
  } as unknown as Guild;
}

// ============================================
// Mock Command Options
// ============================================

export interface MockCommandOptions {
  [key: string]: string | number | boolean | null | undefined;
}

export function createMockOptionsResolver(
  options: MockCommandOptions = {},
  channels?: Map<string, { id: string; name?: string }>
): CommandInteractionOptionResolver {
  return {
    getString: (name: string) => options[name] as string | null ?? null,
    getInteger: (name: string) => options[name] as number | null ?? null,
    getNumber: (name: string) => options[name] as number | null ?? null,
    getBoolean: (name: string) => options[name] as boolean | null ?? null,
    getUser: (name: string) => {
      const id = options[name] as string | null;
      return id ? createMockUser({ id }) : null;
    },
    getMember: (name: string) => {
      const id = options[name] as string | null;
      return id ? createMockGuildMember({ id }) : null;
    },
    getChannel: (name: string) => {
      const channelId = options[name] as string | null;
      if (channelId && channels?.has(channelId)) {
        return channels.get(channelId) ?? null;
      }
      // Return a mock channel if channelId is provided
      if (channelId) {
        return { id: channelId, name: `channel-${channelId}` };
      }
      return null;
    },
    getRole: () => null,
    getMentionable: () => null,
    getAttachment: () => null,
    getSubcommand: () => options._subcommand as string ?? null,
    getSubcommandGroup: () => options._subcommandGroup as string ?? null,
    get: (name: string) => ({ value: options[name] }),
    data: Object.entries(options).map(([name, value]) => ({ name, value })),
  } as unknown as CommandInteractionOptionResolver;
}

// ============================================
// Mock Chat Input Command Interaction
// ============================================

export interface MockChatInputInteractionOptions {
  commandName: string;
  options?: MockCommandOptions;
  user?: MockUserOptions;
  member?: MockGuildMemberOptions;
  guild?: MockGuildOptions;
  channel?: MockTextChannel | MockThreadChannel;
  client?: unknown;
}

export interface InteractionReply {
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
  ephemeral?: boolean;
  fetchReply?: boolean;
}

/**
 * Mock ChatInputCommandInteraction for testing slash commands.
 */
export class MockChatInputInteraction extends EventEmitter {
  id: string;
  commandName: string;
  options: CommandInteractionOptionResolver;
  user: User;
  member: GuildMember | null;
  guild: Guild | null;
  guildId: string | null;
  channel: MockTextChannel | MockThreadChannel | null;
  channelId: string | null;
  client: unknown;

  replied = false;
  deferred = false;
  ephemeral = false;

  replies: InteractionReply[] = [];
  followUps: InteractionReply[] = [];

  constructor(options: MockChatInputInteractionOptions) {
    super();
    this.id = `interaction-${Date.now()}`;
    this.commandName = options.commandName;
    this.options = createMockOptionsResolver(options.options ?? {});
    this.user = createMockUser(options.user);
    this.member = options.member ? createMockGuildMember(options.member) : null;
    this.guild = options.guild ? createMockGuild(options.guild) : null;
    this.guildId = this.guild?.id ?? null;
    this.channel = options.channel ?? null;
    this.channelId = this.channel?.id ?? null;
    this.client = options.client ?? {};
  }

  async reply(options: string | InteractionReplyOptions): Promise<InteractionResponse | Message> {
    if (this.replied || this.deferred) {
      throw new Error('Interaction has already been acknowledged');
    }

    const reply: InteractionReply = typeof options === 'string'
      ? { content: options }
      : {
          content: options.content,
          embeds: options.embeds as unknown[],
          components: options.components as unknown[],
          ephemeral: options.ephemeral,
        };

    this.replies.push(reply);
    this.replied = true;
    this.ephemeral = reply.ephemeral ?? false;
    this.emit('reply', reply);

    // Return mock message if fetchReply is true
    if (typeof options !== 'string' && options.fetchReply) {
      return {
        id: `msg-${Date.now()}`,
        content: reply.content ?? '',
        embeds: reply.embeds ?? [],
        components: reply.components ?? [],
      } as unknown as Message;
    }

    return {} as InteractionResponse;
  }

  async deferReply(options?: { ephemeral?: boolean }): Promise<InteractionResponse> {
    if (this.replied || this.deferred) {
      throw new Error('Interaction has already been acknowledged');
    }

    this.deferred = true;
    this.ephemeral = options?.ephemeral ?? false;
    this.emit('deferred', { ephemeral: this.ephemeral });

    return {} as InteractionResponse;
  }

  async editReply(options: string | InteractionReplyOptions): Promise<Message> {
    if (!this.replied && !this.deferred) {
      throw new Error('Interaction has not been acknowledged');
    }

    const edit: InteractionReply = typeof options === 'string'
      ? { content: options }
      : {
          content: options.content,
          embeds: options.embeds as unknown[],
          components: options.components as unknown[],
        };

    // Replace the last reply
    if (this.replies.length > 0) {
      this.replies[this.replies.length - 1] = edit;
    } else {
      this.replies.push(edit);
    }

    this.emit('editReply', edit);

    return {
      id: `msg-${Date.now()}`,
      content: edit.content ?? '',
      embeds: edit.embeds ?? [],
      components: edit.components ?? [],
    } as unknown as Message;
  }

  async followUp(options: string | InteractionReplyOptions): Promise<Message> {
    if (!this.replied && !this.deferred) {
      throw new Error('Interaction has not been acknowledged');
    }

    const followUp: InteractionReply = typeof options === 'string'
      ? { content: options }
      : {
          content: options.content,
          embeds: options.embeds as unknown[],
          components: options.components as unknown[],
          ephemeral: options.ephemeral,
        };

    this.followUps.push(followUp);
    this.emit('followUp', followUp);

    return {
      id: `msg-${Date.now()}`,
      content: followUp.content ?? '',
      embeds: followUp.embeds ?? [],
      components: followUp.components ?? [],
    } as unknown as Message;
  }

  async deleteReply(): Promise<void> {
    this.emit('deleteReply');
  }

  isChatInputCommand(): this is MockChatInputInteraction {
    return true;
  }

  isButton(): boolean {
    return false;
  }

  isStringSelectMenu(): boolean {
    return false;
  }

  isAutocomplete(): boolean {
    return false;
  }

  isRepliable(): boolean {
    return !this.replied;
  }

  inGuild(): boolean {
    return this.guildId !== null;
  }

  get lastReply(): InteractionReply | null {
    return this.replies.length > 0 ? this.replies[this.replies.length - 1] : null;
  }

  get lastFollowUp(): InteractionReply | null {
    return this.followUps.length > 0 ? this.followUps[this.followUps.length - 1] : null;
  }

  toJSON(): Partial<ChatInputCommandInteraction> {
    return {
      id: this.id,
      commandName: this.commandName,
    } as Partial<ChatInputCommandInteraction>;
  }
}

// ============================================
// Mock Button Interaction
// ============================================

export interface MockButtonInteractionOptions {
  customId: string;
  user?: MockUserOptions;
  member?: MockGuildMemberOptions;
  guild?: MockGuildOptions;
  channel?: MockTextChannel | MockThreadChannel;
  message?: MockMessage;
  client?: unknown;
}

/**
 * Mock ButtonInteraction for testing button clicks.
 */
export class MockButtonInteraction extends EventEmitter {
  id: string;
  customId: string;
  user: User;
  member: GuildMember | null;
  guild: Guild | null;
  guildId: string | null;
  channel: MockTextChannel | MockThreadChannel | null;
  channelId: string | null;
  message: MockMessage | null;
  client: unknown;

  replied = false;
  deferred = false;
  ephemeral = false;

  replies: InteractionReply[] = [];
  updates: InteractionReply[] = [];

  constructor(options: MockButtonInteractionOptions) {
    super();
    this.id = `button-${Date.now()}`;
    this.customId = options.customId;
    this.user = createMockUser(options.user);
    this.member = options.member ? createMockGuildMember(options.member) : null;
    this.guild = options.guild ? createMockGuild(options.guild) : null;
    this.guildId = this.guild?.id ?? null;
    this.channel = options.channel ?? null;
    this.channelId = this.channel?.id ?? null;
    this.message = options.message ?? null;
    this.client = options.client ?? {};
  }

  async reply(options: string | InteractionReplyOptions): Promise<InteractionResponse | Message> {
    if (this.replied || this.deferred) {
      throw new Error('Interaction has already been acknowledged');
    }

    const reply: InteractionReply = typeof options === 'string'
      ? { content: options }
      : {
          content: options.content,
          embeds: options.embeds as unknown[],
          components: options.components as unknown[],
          ephemeral: options.ephemeral,
        };

    this.replies.push(reply);
    this.replied = true;
    this.ephemeral = reply.ephemeral ?? false;
    this.emit('reply', reply);

    return {} as InteractionResponse;
  }

  async deferReply(options?: { ephemeral?: boolean }): Promise<InteractionResponse> {
    if (this.replied || this.deferred) {
      throw new Error('Interaction has already been acknowledged');
    }

    this.deferred = true;
    this.ephemeral = options?.ephemeral ?? false;
    this.emit('deferred', { ephemeral: this.ephemeral });

    return {} as InteractionResponse;
  }

  async deferUpdate(): Promise<InteractionResponse> {
    if (this.replied || this.deferred) {
      throw new Error('Interaction has already been acknowledged');
    }

    this.deferred = true;
    this.emit('deferUpdate');

    return {} as InteractionResponse;
  }

  async update(options: string | InteractionReplyOptions): Promise<Message> {
    const update: InteractionReply = typeof options === 'string'
      ? { content: options }
      : {
          content: options.content,
          embeds: options.embeds as unknown[],
          components: options.components as unknown[],
        };

    this.updates.push(update);
    this.replied = true;
    this.emit('update', update);

    return {} as unknown as Message;
  }

  async editReply(options: string | InteractionReplyOptions): Promise<Message> {
    if (!this.replied && !this.deferred) {
      throw new Error('Interaction has not been acknowledged');
    }

    const edit: InteractionReply = typeof options === 'string'
      ? { content: options }
      : {
          content: options.content,
          embeds: options.embeds as unknown[],
          components: options.components as unknown[],
        };

    // Replace the last reply
    if (this.replies.length > 0) {
      this.replies[this.replies.length - 1] = edit;
    } else {
      this.replies.push(edit);
    }

    this.emit('editReply', edit);

    return {
      id: `msg-${Date.now()}`,
      content: edit.content ?? '',
      embeds: edit.embeds ?? [],
      components: edit.components ?? [],
    } as unknown as Message;
  }

  async followUp(options: string | InteractionReplyOptions): Promise<Message> {
    if (!this.replied && !this.deferred) {
      throw new Error('Interaction has not been acknowledged');
    }

    const followUp: InteractionReply = typeof options === 'string'
      ? { content: options }
      : {
          content: options.content,
          embeds: options.embeds as unknown[],
          components: options.components as unknown[],
          ephemeral: options.ephemeral,
        };

    this.replies.push(followUp);
    this.emit('followUp', followUp);

    return {
      id: `msg-${Date.now()}`,
      content: followUp.content ?? '',
      embeds: followUp.embeds ?? [],
      components: followUp.components ?? [],
    } as unknown as Message;
  }

  isChatInputCommand(): boolean {
    return false;
  }

  isButton(): this is MockButtonInteraction {
    return true;
  }

  isStringSelectMenu(): boolean {
    return false;
  }

  isAutocomplete(): boolean {
    return false;
  }

  isRepliable(): boolean {
    return !this.replied;
  }

  inGuild(): boolean {
    return this.guildId !== null;
  }

  get lastReply(): InteractionReply | null {
    return this.replies.length > 0 ? this.replies[this.replies.length - 1] : null;
  }

  get lastUpdate(): InteractionReply | null {
    return this.updates.length > 0 ? this.updates[this.updates.length - 1] : null;
  }

  toJSON(): Partial<ButtonInteraction> {
    return {
      id: this.id,
      customId: this.customId,
    } as Partial<ButtonInteraction>;
  }
}

// ============================================
// Factory Functions
// ============================================

export function createMockChatInputInteraction(
  options: MockChatInputInteractionOptions
): MockChatInputInteraction {
  return new MockChatInputInteraction(options);
}

export function createMockButtonInteraction(
  options: MockButtonInteractionOptions
): MockButtonInteraction {
  return new MockButtonInteraction(options);
}
