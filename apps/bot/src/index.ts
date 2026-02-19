import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { loadCommands } from './utils/commandLoader.js';
import { loadEvents } from './utils/eventLoader.js';
import { startPollingService, stopPollingService } from './services/pollingService.js';
import type { Command, ExtendedClient } from './types.js';
import { logger } from './lib/logger.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as ExtendedClient;

// Initialize commands collection
client.commands = new Collection<string, Command>();

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('DISCORD_TOKEN is required');
  }

  // Load commands and events
  logger.info('Loading commands...');
  client.commands = await loadCommands();

  logger.info('Loading events...');
  await loadEvents(client);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    await stopPollingService();
    client.destroy();
    logger.info('Discord client destroyed. Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Login to Discord first so the client is ready for polling service
  await client.login(token);

  // Start polling service (requires REDIS_URL and STARTGG_API_KEY)
  // Pass Discord client so it can create match threads
  if (process.env.REDIS_URL && process.env.STARTGG_API_KEY) {
    await startPollingService(client);
  } else {
    logger.warn('[PollingService] Skipped - REDIS_URL or STARTGG_API_KEY not configured');
  }
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to start bot');
  process.exit(1);
});
