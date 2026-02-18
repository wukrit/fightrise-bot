import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import type { Command } from '../types.js';
import { prisma, RegistrationSource, RegistrationStatus } from '@fightrise/database';
import { requireGuild, requireGuildWithReply } from '../utils/guildValidation.js';

/**
 * Verifies that the user has Discord Manage Server permissions.
 * Returns false and sends an error reply if the user lacks permissions.
 */
async function verifyDiscordPermissions(
  interaction: ChatInputCommandInteraction,
  adminId: string
): Promise<boolean> {
  const member = await interaction.guild?.members.fetch(adminId);
  if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.editReply({
      content: 'You need Manage Server permissions to use admin commands.',
    });
    return false;
  }
  return true;
}

/**
 * Verifies that the user is a tournament admin for the specified tournament.
 * Returns false and sends an error reply if the user is not an admin.
 */
async function verifyTournamentAdmin(
  interaction: ChatInputCommandInteraction,
  adminId: string,
  tournamentId: string
): Promise<boolean> {
  const admin = await prisma.tournamentAdmin.findFirst({
    where: {
      user: { discordId: adminId },
      tournamentId,
    },
  });

  if (!admin) {
    await interaction.editReply({
      content: 'You are not an admin for this tournament.',
    });
    return false;
  }
  return true;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands for tournament management')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('register')
        .setDescription('Manually register a player for a tournament')
        .addStringOption((option) =>
          option
            .setName('tournament')
            .setDescription('Tournament name')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Discord user to register')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('display-name')
            .setDescription('Display name for the player')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('registrations')
        .setDescription('View pending registrations for a tournament')
        .addStringOption((option) =>
          option
            .setName('tournament')
            .setDescription('Tournament name')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const guildId = requireGuild(interaction);

    if (!guildId) {
      await interaction.respond([]);
      return;
    }

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
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'register') {
      await handleAdminRegister(interaction);
    } else if (subcommand === 'registrations') {
      await handleAdminRegistrations(interaction);
    }
  },
};

async function handleAdminRegister(interaction: ChatInputCommandInteraction): Promise<void> {
  const adminId = interaction.user.id;

  const guildId = await requireGuildWithReply(interaction);
  if (!guildId) return;

  const tournamentId = interaction.options.getString('tournament', true);
  const targetUser = interaction.options.getUser('user', true);
  const displayName = interaction.options.getString('display-name') || targetUser.username;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Verify Discord guild and tournament admin permissions
    const hasDiscordPerms = await verifyDiscordPermissions(interaction, adminId);
    if (!hasDiscordPerms) return;

    const isTournamentAdmin = await verifyTournamentAdmin(interaction, adminId, tournamentId);
    if (!isTournamentAdmin) return;

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { events: true },
    });

    if (!tournament) {
      await interaction.editReply({
        content: 'Tournament not found.',
      });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: targetUser.id,
          discordUsername: targetUser.username,
          displayName,
        },
      });
    }

    // Check for existing registration
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        userId: user.id,
        tournamentId,
      },
    });

    if (existingRegistration) {
      await interaction.editReply({
        content: `User is already registered for this tournament (status: ${existingRegistration.status}).`,
      });
      return;
    }

    // Create manual registration
    const registration = await prisma.registration.create({
      data: {
        userId: user.id,
        tournamentId,
        source: RegistrationSource.MANUAL,
        status: RegistrationStatus.CONFIRMED,
        displayName,
      },
    });

    // Build success embed
    const embed = new EmbedBuilder()
      .setTitle('Player Registered')
      .setColor(Colors.Green)
      .addFields(
        {
          name: 'Player',
          value: `${targetUser.username} (${targetUser.id})`,
          inline: true,
        },
        {
          name: 'Tournament',
          value: tournament.name,
          inline: true,
        },
        {
          name: 'Display Name',
          value: displayName,
          inline: true,
        }
      )
      .setFooter({
        text: `Registration ID: ${registration.id}`,
      });

    await interaction.editReply({
      embeds: [embed],
    });

    // Try to DM the registered user
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('You have been registered!')
        .setColor(Colors.Green)
        .setDescription(`You have been registered for **${tournament.name}** by a tournament admin.`)
        .addFields({
          name: 'Display Name',
          value: displayName,
        });

      await targetUser.send({
        embeds: [dmEmbed],
      });
    } catch (dmError) {
      // User might have DMs disabled - that's okay
      console.log('Could not DM user:', dmError);
    }
  } catch (error) {
    console.error('Error in admin register command:', error);
    await interaction.editReply({
      content: 'Failed to register player. Please try again.',
    });
  }
}

async function handleAdminRegistrations(interaction: ChatInputCommandInteraction): Promise<void> {
  const adminId = interaction.user.id;

  const guildId = await requireGuildWithReply(interaction);
  if (!guildId) return;

  const tournamentId = interaction.options.getString('tournament', true);

  await interaction.deferReply({ ephemeral: true });

  try {
    // Verify Discord guild and tournament admin permissions
    const hasDiscordPerms = await verifyDiscordPermissions(interaction, adminId);
    if (!hasDiscordPerms) return;

    const isTournamentAdmin = await verifyTournamentAdmin(interaction, adminId, tournamentId);
    if (!isTournamentAdmin) return;

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      await interaction.editReply({
        content: 'Tournament not found.',
      });
      return;
    }

    // Get pending registrations
    const registrations = await prisma.registration.findMany({
      where: {
        tournamentId,
        status: RegistrationStatus.PENDING,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (registrations.length === 0) {
      await interaction.editReply({
        content: 'No pending registrations for this tournament.',
      });
      return;
    }

    // Build embed with registrations
    const embed = new EmbedBuilder()
      .setTitle(`Pending Registrations - ${tournament.name}`)
      .setColor(Colors.Blue)
      .setDescription(`${registrations.length} registration(s) awaiting approval`);

    // Add registration entries
    for (const reg of registrations) {
      const playerName = reg.displayName || reg.user?.discordUsername || 'Unknown';
      embed.addFields({
        name: playerName,
        value: `Source: ${reg.source} • ID: ${reg.id}`,
        inline: false,
      });
    }

    // Add action buttons for the first registration
    const firstReg = registrations[0];
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success)
        .setCustomId(`reg-approve:${firstReg.id}`),
      new ButtonBuilder()
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`reg-reject:${firstReg.id}`),
      new ButtonBuilder()
        .setLabel('Info')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`reg-info:${firstReg.id}`)
    );

    await interaction.editReply({
      embeds: [embed],
      components: registrations.length > 0 ? [row] : [],
    });
  } catch (error) {
    console.error('Error in admin registrations command:', error);
    await interaction.editReply({
      content: 'Failed to fetch registrations. Please try again.',
    });
  }
}

export default command;
