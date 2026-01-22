import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Command } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(): Promise<Collection<string, Command>> {
  const commands = new Collection<string, Command>();
  const commandsPath = join(__dirname, '..', 'commands');

  let commandFiles: string[];
  try {
    commandFiles = readdirSync(commandsPath).filter(
      (file) =>
        (file.endsWith('.js') || file.endsWith('.ts')) &&
        !file.endsWith('.d.ts') &&
        !file.includes('.test.') &&
        !file.includes('.spec.')
    );
  } catch {
    console.warn('No commands directory found or it is empty');
    return commands;
  }

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    try {
      const commandModule = await import(filePath);
      const command: Command = commandModule.default || commandModule;

      if ('data' in command && 'execute' in command) {
        commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
      } else {
        console.warn(
          `Command at ${filePath} is missing required "data" or "execute" property`
        );
      }
    } catch (error) {
      console.error(`Failed to load command at ${filePath}:`, error);
    }
  }

  return commands;
}

export function getCommandsData(commands: Collection<string, Command>): unknown[] {
  return commands.map((command) => command.data.toJSON());
}
