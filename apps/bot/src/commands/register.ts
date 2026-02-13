import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { Command } from '../types.js';
import { prisma, TournamentState, RegistrationSource, RegistrationStatus } from '@fightrise/database';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register for a tournament')
    .addStringOption((option) =>
      option
        .setName('tournament')
        .setDescription('Tournament to register for')
        .setRequired(true)
        .setAutocomplete(true)
    ) as Command['data'],

  async autocomplete(interaction: AutocompleteInteraction) {
    await handleAutocomplete(interaction);
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await handleRegister(interaction);
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
    // Get tournaments that are open for registration
    const tournaments = await prisma.tournament.findMany({
      where: {
        discordGuildId: guildId,
        state: TournamentState.REGISTRATION_OPEN,
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

async function handleRegister(interaction: ChatInputCommandInteraction): Promise<void> {
  const discordId = interaction.user.id;
  const tournamentId = interaction.options.getString('tournament', true);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Find the tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        events: true,
      },
    });

    if (!tournament) {
      await interaction.editReply({
        content: 'Tournament not found. Please select a valid tournament.',
      });
      return;
    }

    // Check if registration is open
    if (tournament.state !== TournamentState.REGISTRATION_OPEN) {
      await interaction.editReply({
        content: `Registration is not open for this tournament. Current status: ${tournament.state}`,
      });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      // Create new user with Discord info
      user = await prisma.user.create({
        data: {
          discordId,
          discordUsername: interaction.user.username,
          discordAvatar: interaction.user.avatar
            ? `https://cdn.discordapp.com/avatars/${discordId}/${interaction.user.avatar}.png`
            : null,
        },
      });
    }

    // Check if user has Start.gg linked
    const hasStartggLinked = !!user.startggId && !!user.startggToken;

    // Check for existing registration
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        userId: user.id,
        tournamentId,
      },
    });

    if (existingRegistration) {
      const statusText: Record<RegistrationStatus, string> = {
        [RegistrationStatus.PENDING]: 'pending approval',
        [RegistrationStatus.CONFIRMED]: 'confirmed',
        [RegistrationStatus.CANCELLED]: 'cancelled',
        [RegistrationStatus.DQ]: 'disqualified',
      };

      await interaction.editReply({
        content: `You are already registered for this tournament. Status: ${statusText[existingRegistration.status] || 'unknown'}`,
      });
      return;
    }

    if (hasStartggLinked) {
      // User has Start.gg linked - show options
      const embed = new EmbedBuilder()
        .setTitle(`Register for ${tournament.name}`)
        .setColor(Colors.Green)
        .setDescription('You have Start.gg linked! You can register directly or go to Start.gg.')
        .addFields(
          {
            name: 'Events',
            value: tournament.events.map((e) => `• ${e.name}`).join('\n') || 'No events available',
            inline: false,
          }
        );

      const startggUrl = `https://start.gg/${tournament.startggSlug}`;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Register on Start.gg')
          .setStyle(ButtonStyle.Link)
          .setURL(startggUrl),
        new ButtonBuilder()
          .setLabel('Register Now (Auto)')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`register:auto:${tournamentId}`)
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } else {
      // User doesn't have Start.gg linked - create pending registration
      await prisma.registration.create({
        data: {
          userId: user.id,
          tournamentId,
          source: RegistrationSource.DISCORD,
          status: RegistrationStatus.PENDING,
          displayName: user.displayName || interaction.user.username,
        },
      });

      const embed = new EmbedBuilder()
        .setTitle('Registration Pending')
        .setColor(Colors.Yellow)
        .setDescription(
          `Your registration for **${tournament.name}** has been submitted for approval.`
        )
        .addFields(
          {
            name: 'Status',
            value: 'Pending Approval',
            inline: true,
          },
          {
            name: 'Display Name',
            value: interaction.user.username,
            inline: true,
          }
        )
        .setFooter({
          text: 'An admin will review your registration shortly.',
        });

      await interaction.editReply({
        embeds: [embed],
      });

      // TODO: Notify tournament admins of pending registration
    }
  } catch (error) {
    console.error('Error during registration:', error);
    await interaction.editReply({
      content: 'Failed to process registration. Please try again.',
    });
  }
}

export default command;
