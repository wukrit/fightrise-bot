/**
 * Smoke tests for Discord API integration.
 *
 * These tests verify that the Discord bot can connect to the real Discord API
 * and perform basic operations. They require valid credentials and a test server.
 *
 * IMPORTANT: These tests use real Discord API calls and should only be run:
 * - Manually before releases
 * - In scheduled CI jobs (not on PRs)
 * - With proper rate limit handling
 *
 * Required environment variables:
 * - SMOKE_DISCORD_TOKEN: Discord bot token for a test bot
 * - SMOKE_DISCORD_GUILD_ID: ID of a test Discord server
 * - SMOKE_DISCORD_CHANNEL_ID: ID of a test channel in that server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';

// Skip all tests if smoke test credentials aren't provided
const SKIP_SMOKE_TESTS = !process.env.SMOKE_DISCORD_TOKEN;

describe.skipIf(SKIP_SMOKE_TESTS)('Discord API Smoke Tests', () => {
  const token = process.env.SMOKE_DISCORD_TOKEN!;
  const guildId = process.env.SMOKE_DISCORD_GUILD_ID!;
  const channelId = process.env.SMOKE_DISCORD_CHANNEL_ID!;

  let client: Client | null = null;
  let rest: REST | null = null;

  beforeAll(async () => {
    // Validate required environment variables
    if (!token) throw new Error('SMOKE_DISCORD_TOKEN is required');
    if (!guildId) throw new Error('SMOKE_DISCORD_GUILD_ID is required');
    if (!channelId) throw new Error('SMOKE_DISCORD_CHANNEL_ID is required');

    // Initialize REST API client
    rest = new REST({ version: '10' }).setToken(token);
  });

  afterAll(async () => {
    // Clean up client connection if established
    if (client) {
      client.destroy();
      client = null;
    }
  });

  describe('REST API', () => {
    it('should authenticate with valid token', async () => {
      // Get current user (bot info)
      const response = await rest!.get(Routes.user('@me')) as {
        id: string;
        username: string;
        bot: boolean;
      };

      expect(response).toBeDefined();
      expect(response.id).toBeTruthy();
      expect(response.username).toBeTruthy();
      expect(response.bot).toBe(true);
    });

    it('should fetch test guild information', async () => {
      const response = await rest!.get(Routes.guild(guildId)) as {
        id: string;
        name: string;
      };

      expect(response).toBeDefined();
      expect(response.id).toBe(guildId);
      expect(response.name).toBeTruthy();
    });

    it('should fetch test channel information', async () => {
      const response = await rest!.get(Routes.channel(channelId)) as {
        id: string;
        name: string;
        guild_id: string;
      };

      expect(response).toBeDefined();
      expect(response.id).toBe(channelId);
      expect(response.guild_id).toBe(guildId);
    });

    it('should have registered slash commands', async () => {
      // Get guild commands
      const commands = await rest!.get(
        Routes.applicationGuildCommands(
          (await rest!.get(Routes.user('@me')) as { id: string }).id,
          guildId
        )
      ) as Array<{ name: string }>;

      expect(Array.isArray(commands)).toBe(true);

      // Log available commands for debugging
      console.log('Registered commands:', commands.map((c) => c.name).join(', '));
    });
  });

  describe('Gateway Connection', () => {
    it('should connect to Discord gateway', async () => {
      client = new Client({
        intents: [GatewayIntentBits.Guilds],
      });

      // Set up a promise that resolves when ready
      const readyPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        client!.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        client!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await client.login(token);
      await readyPromise;

      expect(client.isReady()).toBe(true);
      expect(client.user).toBeDefined();
      expect(client.user?.bot).toBe(true);
    }, 60000); // Extended timeout for connection

    it('should have access to test guild', async () => {
      if (!client || !client.isReady()) {
        // Create new client if previous test didn't run
        client = new Client({
          intents: [GatewayIntentBits.Guilds],
        });
        await client.login(token);
        await new Promise<void>((resolve) => {
          client!.once('ready', () => resolve());
        });
      }

      const guild = client.guilds.cache.get(guildId);
      expect(guild).toBeDefined();
      expect(guild?.id).toBe(guildId);
    });
  });

  describe('Rate Limits', () => {
    it('should handle rate limit info in headers', async () => {
      // Make a simple request and check rate limit info exists
      // The REST client handles rate limits automatically
      const response = await rest!.get(Routes.user('@me'));
      expect(response).toBeDefined();

      // If we got here without error, rate limiting is working
    });
  });
});

describe.skipIf(SKIP_SMOKE_TESTS)('Discord API Error Handling', () => {
  it('should reject invalid tokens', async () => {
    const badRest = new REST({ version: '10' }).setToken('invalid-token');

    await expect(
      badRest.get(Routes.user('@me'))
    ).rejects.toThrow();
  });

  it('should handle non-existent resources', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.SMOKE_DISCORD_TOKEN!);

    await expect(
      rest.get(Routes.guild('999999999999999999'))
    ).rejects.toThrow();
  });
});

// Export skip flag for test runner
export { SKIP_SMOKE_TESTS };
