import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('my-matches')
    .setDescription('View your upcoming matches'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Match lookup is pending implementation.',
      ephemeral: true,
    });
  },
};

export default command;
