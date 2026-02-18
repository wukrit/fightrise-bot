import { Events, Interaction } from 'discord.js';
import type { Event, ExtendedClient } from '../types.js';
import { buttonHandlers } from '../handlers/index.js';
import { parseInteractionId } from '@fightrise/shared';
import { getRedisConnection } from '../lib/redis.js';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger.js';

// Rate limit configuration
const RATE_LIMIT_WINDOW_SECONDS = 10;
const RATE_LIMIT_MAX_ACTIONS = 10;

/**
 * Check if a user is rate limited using a sliding window approach.
 * Returns true if the user should be rate limited.
 */
async function isRateLimited(userId: string): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    const key = `ratelimit:user:${userId}`;

    const now = Date.now();
    const windowStart = now - (RATE_LIMIT_WINDOW_SECONDS * 1000);

    // Use a sorted set to track timestamps of actions
    await redis.zadd(key, now, `${now}:${randomUUID()}`);
    await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);

    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count actions in the current window
    const count = await redis.zcard(key);

    return count > RATE_LIMIT_MAX_ACTIONS;
  } catch (error) {
    logger.error({ err: error, userId }, 'Rate limit check failed');
    // Fail open - allow the action if rate limiting fails
    return false;
  }
}

/**
 * Reply with an ephemeral error message, handling both replied and unreplied states.
 */
async function replyWithError(
  interaction: Interaction,
  message: string
): Promise<void> {
  if (!interaction.isRepliable()) return;

  const content = { content: message, ephemeral: true };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(content);
  } else {
    await interaction.reply(content);
  }
}

const event: Event = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Get user ID for rate limiting (skip for autocomplete as it's less abusive)
    const userId = interaction.user?.id;

    // Handle autocomplete interactions (no rate limiting needed)
    if (interaction.isAutocomplete()) {
      const client = interaction.client as ExtendedClient;
      const command = client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) {
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error({ err: error, commandName: interaction.commandName }, 'Error handling autocomplete');
      }
      return;
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      // Check rate limit before processing
      if (userId && (await isRateLimited(userId))) {
        await replyWithError(
          interaction,
          'You are sending commands too quickly. Please wait a moment before trying again.'
        );
        return;
      }

      const client = interaction.client as ExtendedClient;
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn({ commandName: interaction.commandName }, 'Unknown command received');
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error({ err: error, commandName: interaction.commandName }, 'Error executing command');
        await replyWithError(interaction, 'There was an error executing this command.');
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      // Check rate limit before processing
      if (userId && (await isRateLimited(userId))) {
        await replyWithError(
          interaction,
          'You are performing actions too quickly. Please wait a moment before trying again.'
        );
        return;
      }

      const { prefix, parts } = parseInteractionId(interaction.customId);
      const handler = buttonHandlers.get(prefix);

      if (!handler) {
        logger.warn({ prefix }, 'Unknown button prefix');
        return;
      }

      try {
        await handler.execute(interaction, parts);
      } catch (error) {
        logger.error({ err: error, customId: interaction.customId }, 'Error handling button');
        await replyWithError(interaction, 'There was an error processing this action.');
      }
      return;
    }
  },
};

export default event;
