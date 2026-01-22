import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../types.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Tournament management commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Configure a tournament for this Discord server')
        .addStringOption((option) =>
          option
            .setName('slug')
            .setDescription('Start.gg tournament slug (e.g., tournament/my-tournament)')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('View the current tournament status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup': {
        const slug = interaction.options.getString('slug', true);
        await interaction.reply({
          content: `Tournament setup requested for: \`${slug}\`\n\n*This feature is pending implementation.*`,
          ephemeral: true,
        });
        break;
      }

      case 'status': {
        await interaction.reply({
          content: 'Tournament status display is pending implementation.',
          ephemeral: true,
        });
        break;
      }

      default:
        await interaction.reply({
          content: 'Unknown subcommand.',
          ephemeral: true,
        });
    }
  },
};

export default command;
