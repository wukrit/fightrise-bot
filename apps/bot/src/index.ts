import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { validateEncryptionKey } from '@fightrise/shared';
import { loadCommands } from './utils/commandLoader.js';
import { loadEvents } from './utils/eventLoader.js';
import { startPollingService, stopPollingService } from './services/pollingService.js';
import type { Command, ExtendedClient } from './types.js';

// Validate encryption key at startup - MUST be before any database operations
// P1 FIX: Fail-fast prevents silent plaintext storage
if (process.env.NODE_ENV === 'production') {
  validateEncryptionKey(process.env.ENCRYPTION_KEY);
}

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
  console.log('Loading commands...');
  client.commands = await loadCommands();

  console.log('Loading events...');
  await loadEvents(client);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    await stopPollingService();
    client.destroy();
    console.log('Discord client destroyed. Goodbye!');
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
    console.warn('[PollingService] Skipped - REDIS_URL or STARTGG_API_KEY not configured');
  }
}

main().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});
