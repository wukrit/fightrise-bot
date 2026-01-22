import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register for a tournament'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Tournament registration is pending implementation.',
      ephemeral: true,
    });
  },
};

export default command;
