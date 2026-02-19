import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import {
  INTERACTION_PREFIX,
  DISCORD_COLORS,
  createInteractionId,
} from '@fightrise/shared';
import type { ButtonHandler } from './buttonHandlers.js';
import { reportScore, confirmResult } from '../services/matchService.js';
import { isValidCuid } from './validation.js';

/**
 * Handler for score reporting button interactions.
 * Handles three button prefixes:
 * - report:{matchId}:{winnerSlot} - Report winner
 * - confirm:{matchId} - Confirm reported result
 * - dispute:{matchId} - Dispute reported result
 */
export const scoreHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.REPORT,

  async execute(interaction: ButtonInteraction, parts: string[]): Promise<void> {
    // Parts come after the prefix
    // Quick win: report:abc:1:quick -> parts = ["abc", "1", "quick"]
    // Detailed: report:abc:select -> parts = ["abc", "select"]
    // Select menu value format: "1|2-1" means winnerSlot=1, score="2-1"
    if (parts.length < 1 || !parts[0]) {
      await interaction.reply({ content: 'Invalid button format: missing match ID.', ephemeral: true });
      return;
    }

    const [matchId, winnerSlotOrScore, type] = parts;

    // Validate matchId format (CUID)
    if (!isValidCuid(matchId)) {
      await interaction.reply({ content: `Invalid match ID: "${matchId}" is not a valid format.`, ephemeral: true });
      return;
    }

    let winnerSlot: number;
    let score: string | undefined;

    if (type === 'quick') {
      // Quick win button (2-0/3-0 sweep)
      winnerSlot = parseInt(winnerSlotOrScore, 10);
      if (isNaN(winnerSlot) || winnerSlot < 1 || winnerSlot > 2) {
        await interaction.reply({ content: `Invalid winner slot: "${winnerSlotOrScore}" - must be 1 or 2.`, ephemeral: true });
        return;
      }
    } else if (winnerSlotOrScore.includes('|')) {
      // Detailed score from select menu (e.g., "1|2-1")
      const [slot, matchScore] = winnerSlotOrScore.split('|');
      winnerSlot = parseInt(slot, 10);
      score = matchScore;
      if (isNaN(winnerSlot) || winnerSlot < 1 || winnerSlot > 2) {
        await interaction.reply({ content: `Invalid score selection: winner slot must be 1 or 2.`, ephemeral: true });
        return;
      }
    } else {
      // Fallback for legacy button format
      winnerSlot = parseInt(winnerSlotOrScore, 10);
      if (isNaN(winnerSlot) || winnerSlot < 1 || winnerSlot > 2) {
        await interaction.reply({ content: `Invalid winner slot: "${winnerSlotOrScore}" - must be 1 or 2.`, ephemeral: true });
        return;
      }
    }

    // Defer immediately to get 15 minutes instead of 3 seconds
    await interaction.deferReply({ ephemeral: true });

    // Delegate to service (pass score for detailed reporting)
    const result = await reportScore(matchId, interaction.user.id, winnerSlot, score);

    // Use editReply for deferred interactions
    await interaction.editReply({ content: result.message });

    // Update embed if successful
    if (result.success && result.matchStatus) {
      const match = result.matchStatus;
      const [p1, p2] = match.players;
      if (!p1 || !p2) return;

      if (result.autoCompleted) {
        // Match is complete - show final result
        const winner = match.players.find((p) => p.isWinner === true);
        const embed = buildCompletedEmbed(match, winner?.playerName ?? 'Unknown');
        await interaction.message.edit({ embeds: [embed], components: [] });

        // Announce in thread
        if (interaction.channel?.isThread()) {
          await interaction.channel.send(`Match complete! ${winner?.playerName} wins. Good games!`);
        }
      } else {
        // Self-report - show pending confirmation state
        const winner = match.players.find((p) => p.isWinner === true);
        const loser = match.players.find((p) => p.isWinner !== true);
        if (!winner || !loser) return;

        const embed = buildPendingConfirmationEmbed(match, winner.playerName, loser.playerName);
        const confirmButtons = buildConfirmButtons(matchId);

        await interaction.message.edit({ embeds: [embed], components: [confirmButtons] });

        // Announce in thread, ping the opponent
        if (interaction.channel?.isThread()) {
          const loserMention = loser.discordId ? `<@${loser.discordId}>` : loser.playerName;
          await interaction.channel.send(
            `${winner.playerName} reported themselves as the winner. ${loserMention}, please confirm or dispute the result.`
          );
        }
      }
    }
  },
};

/**
 * Handler for confirmation button interactions.
 */
export const confirmHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.CONFIRM,

  async execute(interaction: ButtonInteraction, parts: string[]): Promise<void> {
    if (parts.length < 1 || !parts[0]) {
      await interaction.reply({ content: 'Invalid button format: missing match ID.', ephemeral: true });
      return;
    }

    const [matchId] = parts;

    // Validate matchId format (CUID)
    if (!isValidCuid(matchId)) {
      await interaction.reply({ content: `Invalid match ID: "${matchId}" is not a valid format.`, ephemeral: true });
      return;
    }

    // Defer immediately to get 15 minutes instead of 3 seconds
    await interaction.deferReply({ ephemeral: true });

    // Confirm the result
    const result = await confirmResult(matchId, interaction.user.id, true);

    await interaction.editReply({ content: result.message });

    if (result.success && result.matchStatus) {
      const match = result.matchStatus;
      const winner = match.players.find((p) => p.isWinner === true);

      const embed = buildCompletedEmbed(match, winner?.playerName ?? 'Unknown');
      await interaction.message.edit({ embeds: [embed], components: [] });

      if (interaction.channel?.isThread()) {
        await interaction.channel.send(`Match complete! ${winner?.playerName} wins. Good games!`);
      }
    }
  },
};

/**
 * Handler for dispute button interactions.
 */
export const disputeHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.DISPUTE,

  async execute(interaction: ButtonInteraction, parts: string[]): Promise<void> {
    if (parts.length < 1 || !parts[0]) {
      await interaction.reply({ content: 'Invalid button format: missing match ID.', ephemeral: true });
      return;
    }

    const [matchId] = parts;

    // Validate matchId format (CUID)
    if (!isValidCuid(matchId)) {
      await interaction.reply({ content: `Invalid match ID: "${matchId}" is not a valid format.`, ephemeral: true });
      return;
    }

    // Defer immediately to get 15 minutes instead of 3 seconds
    await interaction.deferReply({ ephemeral: true });

    // Dispute the result
    const result = await confirmResult(matchId, interaction.user.id, false);

    await interaction.editReply({ content: result.message });

    if (result.success && result.matchStatus) {
      const match = result.matchStatus;
      const [p1, p2] = match.players;
      if (!p1 || !p2) return;

      // Rebuild the original report buttons so players can try again
      const embed = buildDisputedEmbed(match, p1.playerName, p2.playerName);
      const reportButtons = buildReportButtons(matchId, p1.playerName, p2.playerName);

      await interaction.message.edit({ embeds: [embed], components: reportButtons });

      if (interaction.channel?.isThread()) {
        await interaction.channel.send(
          'Result disputed! Please discuss and report the correct result, or contact a tournament organizer.'
        );
      }
    }
  },
};

// ============================================================================
// Embed Builders
// ============================================================================

function buildCompletedEmbed(
  match: { roundText: string; identifier: string; players: Array<{ playerName: string; discordId: string | null; isWinner?: boolean | null }> },
  winnerName: string
): EmbedBuilder {
  const [p1, p2] = match.players;
  const p1Mention = p1?.discordId ? `<@${p1.discordId}>` : p1?.playerName ?? 'Player 1';
  const p2Mention = p2?.discordId ? `<@${p2.discordId}>` : p2?.playerName ?? 'Player 2';

  return new EmbedBuilder()
    .setTitle(match.roundText)
    .setDescription(`${p1Mention} vs ${p2Mention}`)
    .addFields(
      { name: 'Match ID', value: match.identifier, inline: true },
      { name: 'Status', value: '✅ Complete', inline: true },
      { name: 'Winner', value: `🏆 ${winnerName}`, inline: true }
    )
    .setColor(DISCORD_COLORS.SUCCESS);
}

function buildPendingConfirmationEmbed(
  match: { roundText: string; identifier: string; players: Array<{ playerName: string; discordId: string | null }> },
  winnerName: string,
  loserName: string
): EmbedBuilder {
  const [p1, p2] = match.players;
  const p1Mention = p1?.discordId ? `<@${p1.discordId}>` : p1?.playerName ?? 'Player 1';
  const p2Mention = p2?.discordId ? `<@${p2.discordId}>` : p2?.playerName ?? 'Player 2';

  return new EmbedBuilder()
    .setTitle(match.roundText)
    .setDescription(`${p1Mention} vs ${p2Mention}`)
    .addFields(
      { name: 'Match ID', value: match.identifier, inline: true },
      { name: 'Status', value: '⏳ Pending Confirmation', inline: true },
      { name: 'Reported Winner', value: winnerName, inline: true }
    )
    .setColor(DISCORD_COLORS.WARNING)
    .setFooter({ text: `Waiting for ${loserName} to confirm or dispute` });
}

function buildDisputedEmbed(
  match: { roundText: string; identifier: string },
  player1Name: string,
  player2Name: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(match.roundText)
    .setDescription(`${player1Name} vs ${player2Name}`)
    .addFields(
      { name: 'Match ID', value: match.identifier, inline: true },
      { name: 'Status', value: '⚠️ Result Disputed', inline: true }
    )
    .setColor(DISCORD_COLORS.ERROR)
    .setFooter({ text: 'Please report the correct result or contact a TO' });
}

// ============================================================================
// Button Builders
// ============================================================================

function buildConfirmButtons(matchId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.CONFIRM, matchId))
      .setLabel('Confirm Result')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.DISPUTE, matchId))
      .setLabel('Dispute')
      .setStyle(ButtonStyle.Danger)
  );
}

function buildReportButtons(
  matchId: string,
  player1Name: string,
  player2Name: string
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
  // Quick win buttons for simple 2-0/3-0 sweeps
  const winButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.REPORT, matchId, '1', 'quick'))
      .setLabel(`${player1Name} Wins (2-0/3-0)`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.REPORT, matchId, '2', 'quick'))
      .setLabel(`${player2Name} Wins (2-0/3-0)`)
      .setStyle(ButtonStyle.Success)
  );

  // Select menu for detailed scores
  const scoreSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.REPORT, matchId, 'select'))
      .setPlaceholder('Report detailed score...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${player1Name} wins 2-1`)
          .setValue('1|2-1'),
        new StringSelectMenuOptionBuilder()
          .setLabel(`${player1Name} wins 3-2`)
          .setValue('1|3-2'),
        new StringSelectMenuOptionBuilder()
          .setLabel(`${player2Name} wins 2-1`)
          .setValue('2|2-1'),
        new StringSelectMenuOptionBuilder()
          .setLabel(`${player2Name} wins 3-2`)
          .setValue('2|3-2'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Custom score...')
          .setValue('custom')
      )
  );

  return [winButtons, scoreSelect];
}
