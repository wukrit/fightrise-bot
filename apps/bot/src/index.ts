import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { loadCommands } from './utils/commandLoader.js';
import { loadEvents } from './utils/eventLoader.js';
import type { Command, ExtendedClient } from './types.js';

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
    client.destroy();
    console.log('Discord client destroyed. Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Login to Discord
  await client.login(token);
}

main().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});
