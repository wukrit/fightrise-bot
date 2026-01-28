import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import {
  INTERACTION_PREFIX,
  DISCORD_COLORS,
  createInteractionId,
} from '@fightrise/shared';
import type { ButtonHandler } from './buttonHandlers.js';
import { checkInPlayer, getMatchStatus } from '../services/matchService.js';

/**
 * Handler for check-in button interactions.
 * Button custom ID format: checkin:{matchId}:{playerSlot}
 *
 * This handler:
 * 1. Validates the button click
 * 2. Delegates to checkInPlayer service for business logic
 * 3. Updates the embed to show check-in progress
 * 4. Replaces buttons with score reporting when both players are ready
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
    const slot = parseInt(playerSlot, 10);

    if (isNaN(slot) || slot < 1 || slot > 2) {
      await interaction.reply({ content: 'Invalid button.', ephemeral: true });
      return;
    }

    // Delegate to the agent-native service function
    const result = await checkInPlayer(matchId, interaction.user.id);

    // Reply first (must respond within 3 seconds)
    await interaction.reply({
      content: result.message,
      ephemeral: true,
    });

    // Update the embed if check-in was successful
    if (result.success) {
      const match = await getMatchStatus(matchId);
      if (!match) return;

      const [p1, p2] = match.players;
      if (!p1 || !p2) return;

      // Build player mentions with check-in indicators
      const p1Check = p1.isCheckedIn ? '✅ ' : '';
      const p2Check = p2.isCheckedIn ? '✅ ' : '';
      const p1Mention = p1.discordId
        ? `${p1Check}<@${p1.discordId}>`
        : `${p1Check}${p1.playerName}`;
      const p2Mention = p2.discordId
        ? `${p2Check}<@${p2.discordId}>`
        : `${p2Check}${p2.playerName}`;

      const embed = new EmbedBuilder()
        .setTitle(match.roundText)
        .setDescription(`${p1Mention} vs ${p2Mention}`)
        .addFields({ name: 'Match ID', value: match.identifier, inline: true });

      if (result.bothCheckedIn) {
        // Match is live - show score reporting buttons
        embed
          .addFields({ name: 'Status', value: '🎮 Match Live', inline: true })
          .setColor(DISCORD_COLORS.SUCCESS);

        const scoreButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(createInteractionId(INTERACTION_PREFIX.REPORT, matchId, '1'))
            .setLabel(`${p1.playerName} Won`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(createInteractionId(INTERACTION_PREFIX.REPORT, matchId, '2'))
            .setLabel(`${p2.playerName} Won`)
            .setStyle(ButtonStyle.Success)
        );

        await interaction.message.edit({ embeds: [embed], components: [scoreButtons] });

        // Announce match is live
        if (interaction.channel?.isThread()) {
          await interaction.channel.send('Match is live! Good luck to both players.');
        }
      } else {
        // Partial check-in - update embed with checkmarks, keep check-in buttons
        embed
          .addFields({ name: 'Status', value: 'Waiting for check-in', inline: true })
          .setColor(DISCORD_COLORS.BLURPLE);

        // Keep the original check-in buttons (don't pass components to preserve them)
        await interaction.message.edit({ embeds: [embed] });
      }
    }
  },
};
