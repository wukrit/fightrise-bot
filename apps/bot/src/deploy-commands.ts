import { REST, Routes } from 'discord.js';
import { loadCommands, getCommandsData } from './utils/commandLoader.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token) {
  console.error('Error: DISCORD_TOKEN is required');
  process.exit(1);
}

if (!clientId) {
  console.error('Error: DISCORD_CLIENT_ID is required');
  process.exit(1);
}

async function deployCommands() {
  try {
    console.log('Loading commands...');
    const commands = await loadCommands();
    const commandsData = getCommandsData(commands);

    console.log(`Found ${commandsData.length} commands to register`);

    const rest = new REST().setToken(token!);

    console.log('Registering commands with Discord API...');

    // Register commands globally (or use Routes.applicationGuildCommands for guild-specific)
    await rest.put(Routes.applicationCommands(clientId!), {
      body: commandsData,
    });

    console.log(`Successfully registered ${commandsData.length} commands:`);
    commandsData.forEach((cmd) => {
      const command = cmd as { name: string };
      console.log(`  - /${command.name}`);
    });
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();
