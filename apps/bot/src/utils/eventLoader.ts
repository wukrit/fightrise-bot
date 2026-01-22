import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Client } from 'discord.js';
import type { Event } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = join(__dirname, '..', 'events');

  let eventFiles: string[];
  try {
    eventFiles = readdirSync(eventsPath).filter(
      (file) =>
        (file.endsWith('.js') || file.endsWith('.ts')) &&
        !file.endsWith('.d.ts') &&
        !file.includes('.test.') &&
        !file.includes('.spec.')
    );
  } catch {
    console.warn('No events directory found or it is empty');
    return;
  }

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    try {
      const eventModule = await import(filePath);
      const event: Event = eventModule.default || eventModule;

      if ('name' in event && 'execute' in event) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`Loaded event: ${event.name}${event.once ? ' (once)' : ''}`);
      } else {
        console.warn(
          `Event at ${filePath} is missing required "name" or "execute" property`
        );
      }
    } catch (error) {
      console.error(`Failed to load event at ${filePath}:`, error);
    }
  }
}
