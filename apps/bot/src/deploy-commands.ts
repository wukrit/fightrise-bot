import { REST, Routes } from 'discord.js';
import { loadCommands, getCommandsData } from './utils/commandLoader.js';
import { logger } from './lib/logger.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token) {
  logger.error('DISCORD_TOKEN is required');
  process.exit(1);
}

if (!clientId) {
  logger.error('DISCORD_CLIENT_ID is required');
  process.exit(1);
}

async function deployCommands() {
  try {
    logger.info('Loading commands...');
    const commands = await loadCommands();
    const commandsData = getCommandsData(commands);

    logger.info(`Found ${commandsData.length} commands to register`);

    const rest = new REST().setToken(token!);

    logger.info('Registering commands with Discord API...');

    // Register commands globally (or use Routes.applicationGuildCommands for guild-specific)
    await rest.put(Routes.applicationCommands(clientId!), {
      body: commandsData,
    });

    logger.info(`Successfully registered ${commandsData.length} commands:`);
    commandsData.forEach((cmd) => {
      const command = cmd as { name: string };
      logger.info(`  - /${command.name}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to register commands');
    process.exit(1);
  }
}

deployCommands();
