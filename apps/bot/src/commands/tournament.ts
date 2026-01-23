import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  Colors,
} from 'discord.js';
import type { Command } from '../types.js';
import { getTournamentService } from '../services/tournamentService.js';

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
            .setDescription('Start.gg tournament slug (e.g., my-weekly-42 or full URL)')
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName('match-channel')
            .setDescription('Channel where match threads will be created')
            .addChannelTypes(ChannelType.GuildText)
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
        await handleSetup(interaction);
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

async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  // Defer reply since API calls may take time
  await interaction.deferReply({ ephemeral: true });

  const slug = interaction.options.getString('slug', true);
  const matchChannel = interaction.options.getChannel('match-channel', true);
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (!guildId) {
    await interaction.editReply({
      content: 'This command can only be used in a server.',
    });
    return;
  }

  try {
    const tournamentService = getTournamentService();

    const result = await tournamentService.setupTournament({
      discordUserId: userId,
      discordGuildId: guildId,
      matchChannelId: matchChannel.id,
      tournamentSlug: slug,
    });

    if (!result.success) {
      await interaction.editReply({
        content: result.error.message,
      });
      return;
    }

    const { tournament, isUpdate } = result;

    if (!tournament) {
      await interaction.editReply({
        content: 'An unexpected error occurred. Please try again.',
      });
      return;
    }

    // Build success embed
    const embed = new EmbedBuilder()
      .setTitle(isUpdate ? 'Tournament Updated' : 'Tournament Configured')
      .setColor(Colors.Green)
      .addFields(
        {
          name: 'Tournament',
          value: tournament.name,
          inline: true,
        },
        {
          name: 'Match Channel',
          value: `<#${matchChannel.id}>`,
          inline: true,
        }
      );

    // Add start date if available
    if (tournament.startAt) {
      embed.addFields({
        name: 'Start Date',
        value: `<t:${Math.floor(tournament.startAt.getTime() / 1000)}:F>`,
        inline: true,
      });
    }

    // Add events list
    if (tournament.events && tournament.events.length > 0) {
      const eventsList = tournament.events
        .map((e) => `• ${e.name}${e.numEntrants ? ` (${e.numEntrants} entrants)` : ''}`)
        .join('\n');
      embed.addFields({
        name: `Events (${tournament.events.length})`,
        value: eventsList.slice(0, 1024), // Discord field value limit
      });
    }

    // Add status footer
    embed.setFooter({
      text: `Status: Ready for polling • Slug: ${tournament.startggSlug}`,
    });

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (error) {
    console.error('Error in tournament setup:', error);
    await interaction.editReply({
      content: 'Failed to connect to Start.gg.\n\nPlease try again in a few moments. If the problem persists, check the Start.gg status page.',
    });
  }
}

export default command;
