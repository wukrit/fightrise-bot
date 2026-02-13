import { Events, Interaction } from 'discord.js';
import type { Event, ExtendedClient } from '../types.js';
import { buttonHandlers } from '../handlers/index.js';
import { parseInteractionId } from '@fightrise/shared';

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
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const client = interaction.client as ExtendedClient;
      const command = client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) {
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
      }
      return;
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const client = interaction.client as ExtendedClient;
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.warn(`Unknown command received: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        await replyWithError(interaction, 'There was an error executing this command.');
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const { prefix, parts } = parseInteractionId(interaction.customId);
      const handler = buttonHandlers.get(prefix);

      if (!handler) {
        console.warn(`Unknown button prefix: ${prefix}`);
        return;
      }

      try {
        await handler.execute(interaction, parts);
      } catch (error) {
        console.error(`Error handling button ${interaction.customId}:`, error);
        await replyWithError(interaction, 'There was an error processing this action.');
      }
      return;
    }
  },
};

export default event;
