import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('Check in for your current match'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Match check-in is pending implementation.',
      ephemeral: true,
    });
  },
};

export default command;
