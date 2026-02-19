import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { randomBytes } from 'crypto';
import type { Command } from '../types.js';
import { prisma } from '@fightrise/database';
import { logger } from '../lib/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('link-startgg')
    .setDescription('Link your Start.gg account to your Discord account'),

  async execute(interaction: ChatInputCommandInteraction) {
    await handleLinkStartgg(interaction);
  },
};

async function handleLinkStartgg(interaction: ChatInputCommandInteraction): Promise<void> {
  const discordId = interaction.user.id;
  const discordUsername = interaction.user.username;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user already has Start.gg linked
    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (user?.startggId) {
      // User already has Start.gg linked
      const embed = new EmbedBuilder()
        .setTitle('Start.gg Already Linked')
        .setColor(Colors.Yellow)
        .addFields(
          {
            name: 'Current Link',
            value: `Start.gg: **${user.startggGamerTag || user.startggSlug || user.startggId}**`,
            inline: false,
          },
          {
            name: 'Action',
            value: 'Use `/unlink-startgg` to remove the link.',
            inline: false,
          }
        );

      await interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    // Check if STARTGG_CLIENT_ID is configured
    const startggClientId = process.env.STARTGG_CLIENT_ID;
    const redirectUri = process.env.STARTGG_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/startgg';

    if (!startggClientId) {
      await interaction.editReply({
        content: 'Start.gg OAuth is not configured. Please contact the bot administrator.',
      });
      return;
    }

    // Build OAuth URL with Discord user ID as state
    // The state will be used to link the Start.gg account to the Discord user
    // Include nonce and timestamp for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        discordId,
        discordUsername,
        nonce: randomBytes(32).toString('hex'),
        createdAt: Date.now(),
      })
    ).toString('base64');

    const oauthUrl = new URL('https://start.gg/oauth/authorize');
    oauthUrl.searchParams.set('client_id', startggClientId);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', 'user.identity');
    oauthUrl.searchParams.set('state', state);

    // Show embed with OAuth link
    const embed = new EmbedBuilder()
      .setTitle('Link Start.gg Account')
      .setColor(Colors.Green)
      .setDescription('Click the button below to connect your Start.gg account.')
      .addFields({
        name: 'Note',
        value: 'You will be redirected to Start.gg to authorize the connection.',
        inline: false,
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Connect Start.gg')
        .setStyle(ButtonStyle.Link)
        .setURL(oauthUrl.toString())
    );

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in link-startgg command');
    await interaction.editReply({
      content: 'Failed to generate OAuth link. Please try again.',
    });
  }
}

export default command;
