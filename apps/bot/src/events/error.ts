import { Events } from 'discord.js';
import type { Event } from '../types.js';

const event: Event = {
  name: Events.Error,
  execute(error: Error) {
    console.error('Discord client error:', error);
  },
};

export default event;
