import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report the result of your current match'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Score reporting is pending implementation.',
      ephemeral: true,
    });
  },
};

export default command;
