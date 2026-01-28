import type { ButtonInteraction } from 'discord.js';
import { prisma, MatchState } from '@fightrise/database';
import { INTERACTION_PREFIX } from '@fightrise/shared';
import type { ButtonHandler } from './buttonHandlers.js';

/**
 * Handler for check-in button interactions.
 * Button custom ID format: checkin:{matchId}:{playerSlot}
 * Where playerSlot is '1' or '2' indicating which player position.
 */
export const checkinHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.CHECK_IN,

  async execute(interaction: ButtonInteraction, parts: string[]): Promise<void> {
    const [matchId, playerSlot] = parts;
    const slotIndex = parseInt(playerSlot, 10) - 1; // Convert 1-based to 0-based index

    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 1) {
      await interaction.reply({ content: 'Invalid button.', ephemeral: true });
      return;
    }

    // Fetch match with players
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: {
          include: { user: true },
          orderBy: { id: 'asc' }, // Consistent ordering
        },
      },
    });

    if (!match) {
      await interaction.reply({ content: 'Match not found.', ephemeral: true });
      return;
    }

    // Validate the clicker is the correct player
    const player = match.players[slotIndex];
    if (!player) {
      await interaction.reply({ content: 'Player not found.', ephemeral: true });
      return;
    }

    // Check if the clicker's Discord ID matches the player's linked Discord ID
    if (!player.user?.discordId || player.user.discordId !== interaction.user.id) {
      await interaction.reply({
        content: 'This check-in button is not for you.',
        ephemeral: true,
      });
      return;
    }

    // Check if already checked in
    if (player.isCheckedIn) {
      await interaction.reply({
        content: 'You have already checked in!',
        ephemeral: true,
      });
      return;
    }

    // Check if check-in deadline has passed
    if (match.checkInDeadline && new Date() > match.checkInDeadline) {
      await interaction.reply({
        content: 'Check-in deadline has passed.',
        ephemeral: true,
      });
      return;
    }

    // Update player check-in status
    await prisma.matchPlayer.update({
      where: { id: player.id },
      data: {
        isCheckedIn: true,
        checkedInAt: new Date(),
      },
    });

    // Check if both players are now checked in
    const otherPlayer = match.players[1 - slotIndex];
    const bothCheckedIn = otherPlayer?.isCheckedIn;

    if (bothCheckedIn) {
      // Update match state to CHECKED_IN
      await prisma.match.update({
        where: { id: matchId },
        data: { state: MatchState.CHECKED_IN },
      });

      await interaction.reply({
        content: 'Checked in! Both players are ready - match can begin!',
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'Checked in! Waiting for your opponent.',
        ephemeral: true,
      });
    }
  },
};
