import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@fightrise/database';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('unlink-startgg')
    .setDescription('Unlink your Start.gg account from your Discord account'),

  async execute(interaction: ChatInputCommandInteraction) {
    await handleUnlinkStartgg(interaction);
  },
};

async function handleUnlinkStartgg(interaction: ChatInputCommandInteraction): Promise<void> {
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user has Start.gg linked
    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user?.startggId) {
      // User doesn't have Start.gg linked
      const embed = new EmbedBuilder()
        .setTitle('No Start.gg Linked')
        .setColor(Colors.Yellow)
        .setDescription('You do not have a Start.gg account linked.')
        .addFields({
          name: 'Action',
          value: 'Use `/link-startgg` to link your account.',
          inline: false,
        });

      await interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    // Unlink Start.gg account
    await prisma.user.update({
      where: { discordId },
      data: {
        startggId: null,
        startggSlug: null,
        startggGamerTag: null,
        startggToken: null,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle('Start.gg Unlinked')
      .setColor(Colors.Green)
      .setDescription('Your Start.gg account has been unlinked from Discord.')
      .addFields({
        name: 'Note',
        value: 'You can link a new Start.gg account using `/link-startgg`.',
        inline: false,
      });

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (error) {
    console.error('Error in unlink-startgg command:', error);
    await interaction.editReply({
      content: 'Failed to unlink account. Please try again.',
    });
  }
}

export default command;
