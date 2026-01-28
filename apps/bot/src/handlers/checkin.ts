import type { ButtonInteraction } from 'discord.js';
import { INTERACTION_PREFIX } from '@fightrise/shared';
import type { ButtonHandler } from './buttonHandlers.js';
import { checkInPlayer } from '../services/matchService.js';

/**
 * Handler for check-in button interactions.
 * Button custom ID format: checkin:{matchId}:{playerSlot}
 *
 * This handler is a thin wrapper around the checkInPlayer service function,
 * which contains the actual business logic and is also accessible to agents.
 */
export const checkinHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.CHECK_IN,

  async execute(interaction: ButtonInteraction, parts: string[]): Promise<void> {
    // Validate customId parts before destructuring
    if (parts.length !== 2 || !parts[0]) {
      await interaction.reply({ content: 'Invalid button format.', ephemeral: true });
      return;
    }

    const [matchId, playerSlot] = parts;
    const slotIndex = parseInt(playerSlot, 10) - 1;

    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 1) {
      await interaction.reply({ content: 'Invalid button.', ephemeral: true });
      return;
    }

    // Delegate to the agent-native service function
    const result = await checkInPlayer(matchId, interaction.user.id);

    await interaction.reply({
      content: result.message,
      ephemeral: true,
    });
  },
};
