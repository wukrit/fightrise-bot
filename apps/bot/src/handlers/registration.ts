import { ButtonInteraction, EmbedBuilder, Colors } from 'discord.js';
import { prisma, RegistrationStatus } from '@fightrise/database';
import type { ButtonHandler } from './buttonHandlers.js';

export const registrationHandler: ButtonHandler = {
  prefix: 'reg',

  async execute(interaction: ButtonInteraction, parts: string[]) {
    const action = parts[0];

    if (action === 'approve') {
      await handleApprove(interaction, parts[1]);
    } else if (action === 'reject') {
      await handleReject(interaction, parts[1]);
    } else if (action === 'info') {
      await handleInfo(interaction, parts[1]);
    }
  },
};

async function handleApprove(interaction: ButtonInteraction, registrationId: string): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Verify admin permissions
    const adminId = interaction.user.id;
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
        user: true,
      },
    });

    if (!registration) {
      await interaction.editReply({
        content: 'Registration not found.',
      });
      return;
    }

    const admin = await prisma.tournamentAdmin.findFirst({
      where: {
        user: { discordId: adminId },
        tournamentId: registration.tournamentId,
      },
    });

    if (!admin) {
      await interaction.editReply({
        content: 'You are not an admin for this tournament.',
      });
      return;
    }

    // Update registration status
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CONFIRMED },
    });

    // Send confirmation to admin
    const embed = new EmbedBuilder()
      .setTitle('Registration Approved')
      .setColor(Colors.Green)
      .setDescription(`You approved registration for **${registration.displayName || registration.user?.discordUsername}**.`);

    await interaction.editReply({ embeds: [embed] });

    // Notify the user
    try {
      const discordId = registration.user?.discordId;
      if (!discordId) return;
      const user = await interaction.client.users.fetch(discordId);
      const notifyEmbed = new EmbedBuilder()
        .setTitle('Registration Approved!')
        .setColor(Colors.Green)
        .setDescription(`Your registration for **${registration.tournament.name}** has been approved!`)
        .addFields({
          name: 'Next Steps',
          value: 'You are now confirmed for the tournament. Check-in when your match is called.',
        });

      await user.send({ embeds: [notifyEmbed] });
    } catch (userError) {
      console.log('Could not notify user:', userError);
    }
  } catch (error) {
    console.error('Error approving registration:', error);
    await interaction.editReply({
      content: 'Failed to approve registration. Please try again.',
    });
  }
}

async function handleReject(interaction: ButtonInteraction, registrationId: string): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Verify admin permissions
    const adminId = interaction.user.id;
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
        user: true,
      },
    });

    if (!registration) {
      await interaction.editReply({
        content: 'Registration not found.',
      });
      return;
    }

    const admin = await prisma.tournamentAdmin.findFirst({
      where: {
        user: { discordId: adminId },
        tournamentId: registration.tournamentId,
      },
    });

    if (!admin) {
      await interaction.editReply({
        content: 'You are not an admin for this tournament.',
      });
      return;
    }

    // Update registration status
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED },
    });

    // Send confirmation to admin
    const embed = new EmbedBuilder()
      .setTitle('Registration Rejected')
      .setColor(Colors.Red)
      .setDescription(`You rejected registration for **${registration.displayName || registration.user?.discordUsername}**.`);

    await interaction.editReply({ embeds: [embed] });

    // Notify the user
    try {
      const discordId = registration.user?.discordId;
      if (!discordId) return;
      const user = await interaction.client.users.fetch(discordId);
      const notifyEmbed = new EmbedBuilder()
        .setTitle('Registration Update')
        .setColor(Colors.Red)
        .setDescription(`Your registration for **${registration.tournament.name}** was not approved.`)
        .addFields({
          name: 'Contact',
          value: 'Please contact the tournament organizers for more information.',
        });

      await user.send({ embeds: [notifyEmbed] });
    } catch (userError) {
      console.log('Could not notify user:', userError);
    }
  } catch (error) {
    console.error('Error rejecting registration:', error);
    await interaction.editReply({
      content: 'Failed to reject registration. Please try again.',
    });
  }
}

async function handleInfo(interaction: ButtonInteraction, registrationId: string): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
        user: true,
      },
    });

    if (!registration) {
      await interaction.editReply({
        content: 'Registration not found.',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Registration Details')
      .setColor(Colors.Blue)
      .addFields(
        {
          name: 'Player',
          value: registration.displayName || registration.user?.discordUsername || 'Unknown',
          inline: true,
        },
        {
          name: 'Discord ID',
          value: registration.user?.discordId || 'N/A',
          inline: true,
        },
        {
          name: 'Tournament',
          value: registration.tournament.name,
          inline: true,
        },
        {
          name: 'Source',
          value: registration.source,
          inline: true,
        },
        {
          name: 'Status',
          value: registration.status,
          inline: true,
        },
        {
          name: 'Created',
          value: `<t:${Math.floor(registration.createdAt.getTime() / 1000)}:F>`,
          inline: true,
        }
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error getting registration info:', error);
    await interaction.editReply({
      content: 'Failed to get registration details. Please try again.',
    });
  }
}
