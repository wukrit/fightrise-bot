import { Events, Interaction } from 'discord.js';
import type { Event, ExtendedClient } from '../types.js';
import { buttonHandlers } from '../handlers/index.js';
import { parseInteractionId } from '@fightrise/shared';

const event: Event = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
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

        const errorMessage = 'There was an error executing this command.';

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
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

        const errorMessage = 'There was an error processing this action.';

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
      return;
    }
  },
};

export default event;
