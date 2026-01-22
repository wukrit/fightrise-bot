import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('link-startgg')
    .setDescription('Link your Start.gg account to your Discord account'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Start.gg account linking is pending implementation.',
      ephemeral: true,
    });
  },
};

export default command;
