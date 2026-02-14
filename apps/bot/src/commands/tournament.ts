import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  Colors,
  Client,
} from 'discord.js';
import type { Command } from '../types.js';
import { getTournamentService } from '../services/tournamentService.js';
import { prisma, TournamentState, MatchState } from '@fightrise/database';

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
        .addStringOption((option) =>
          option
            .setName('tournament')
            .setDescription('Tournament to view (defaults to latest)')
            .setAutocomplete(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction: AutocompleteInteraction) {
    await handleAutocomplete(interaction);
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup': {
        await handleSetup(interaction);
        break;
      }

      case 'status': {
        await handleStatus(interaction);
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

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.respond([]);
    return;
  }

  const focusedValue = interaction.options.getFocused();

  try {
    const tournaments = await prisma.tournament.findMany({
      where: {
        discordGuildId: guildId,
      },
      orderBy: {
        startAt: 'desc',
      },
      take: 25,
    });

    const filtered = tournaments.filter((t) =>
      t.name.toLowerCase().includes(focusedValue.toLowerCase())
    );

    await interaction.respond(
      filtered.map((t) => ({
        name: t.name,
        value: t.id,
      }))
    );
  } catch (error) {
    console.error('Autocomplete error:', error);
    await interaction.respond([]);
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const tournamentId = interaction.options.getString('tournament');

  await interaction.deferReply({ ephemeral: true });

  try {
    let tournament;

    if (tournamentId) {
      tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          events: {
            include: {
              matches: {
                include: { players: true },
              },
              _count: {
                select: { registrations: true },
              },
            },
          },
          _count: {
            select: { registrations: true },
          },
        },
      });
    } else {
      // Get the most recent tournament for this guild
      tournament = await prisma.tournament.findFirst({
        where: { discordGuildId: guildId },
        orderBy: { startAt: 'desc' },
        include: {
          events: {
            include: {
              matches: {
                include: { players: true },
              },
              _count: {
                select: { registrations: true },
              },
            },
          },
          _count: {
            select: { registrations: true },
          },
        },
      });
    }

    if (!tournament) {
      await interaction.editReply({
        content: 'No tournament found. Use `/tournament setup` to configure one.',
      });
      return;
    }

    // Calculate statistics
    const totalEntrants = tournament._count.registrations;
    let activeMatches = 0;
    let pendingCheckIn = 0;
    let completedMatches = 0;

    for (const event of tournament.events) {
      for (const match of event.matches) {
        if (match.state === MatchState.IN_PROGRESS || match.state === MatchState.CALLED) {
          activeMatches++;
        } else if (match.state === MatchState.CHECKED_IN) {
          pendingCheckIn++;
        } else if (match.state === MatchState.COMPLETED) {
          completedMatches++;
        }
      }
    }

    // Build status embed
    const stateDisplay: Record<TournamentState, string> = {
      [TournamentState.CREATED]: 'Created',
      [TournamentState.REGISTRATION_OPEN]: 'Registration Open',
      [TournamentState.REGISTRATION_CLOSED]: 'Registration Closed',
      [TournamentState.IN_PROGRESS]: 'In Progress',
      [TournamentState.COMPLETED]: 'Completed',
      [TournamentState.CANCELLED]: 'Cancelled',
    };

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${tournament.name}`)
      .setColor(Colors.Blue)
      .addFields(
        {
          name: 'Status',
          value: stateDisplay[tournament.state] || 'Unknown',
          inline: true,
        },
        {
          name: 'Entrants',
          value: totalEntrants.toString(),
          inline: true,
        }
      );

    if (tournament.startAt) {
      embed.addFields({
        name: 'Start Date',
        value: `<t:${Math.floor(tournament.startAt.getTime() / 1000)}:F>`,
        inline: true,
      });
    }

    embed.addFields(
      {
        name: 'Active Matches',
        value: activeMatches.toString(),
        inline: true,
      },
      {
        name: 'Pending Check-in',
        value: pendingCheckIn.toString(),
        inline: true,
      },
      {
        name: 'Completed',
        value: completedMatches.toString(),
        inline: true,
      }
    );

    // Add events info if there are multiple
    if (tournament.events.length > 0) {
      const eventsInfo = tournament.events
        .map((e) => `• ${e.name}: ${e._count.registrations} entrants`)
        .join('\n');
      embed.addFields({
        name: 'Events',
        value: eventsInfo.slice(0, 1024),
      });
    }

    // Add Start.gg link
    const startggUrl = `https://start.gg/${tournament.startggSlug}`;
    embed.addFields({
      name: 'Links',
      value: `[View on Start.gg](${startggUrl})`,
    });

    embed.setFooter({
      text: `Slug: ${tournament.startggSlug}`,
    });

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (error) {
    console.error('Error fetching tournament status:', error);
    await interaction.editReply({
      content: 'Failed to fetch tournament status. Please try again.',
    });
  }
}

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
      discordClient: interaction.client as Client,
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
