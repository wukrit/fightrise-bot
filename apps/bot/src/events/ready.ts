import { Events, Client } from 'discord.js';
import type { Event } from '../types.js';

const event: Event = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>) {
    console.log(`Bot ready! Logged in as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} guild(s)`);
  },
};

export default event;
