import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import type { Command } from '../types.js';
import { prisma, MatchState } from '@fightrise/database';
import { logger } from '../lib/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('my-matches')
    .setDescription('View your upcoming matches'),

  async execute(interaction: ChatInputCommandInteraction) {
    await handleMyMatches(interaction);
  },
};

async function handleMyMatches(interaction: ChatInputCommandInteraction): Promise<void> {
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Find the user by Discord ID
    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      await interaction.editReply({
        content: 'You are not registered. Use `/link-startgg` to link your Start.gg account.',
      });
      return;
    }

    // Find matches where the user is a player
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { userId: user.id },
      include: {
        match: {
          include: {
            event: {
              include: {
                tournament: true,
              },
            },
            players: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: {
        match: {
          createdAt: 'desc',
        },
      },
    });

    if (matchPlayers.length === 0) {
      await interaction.editReply({
        content: 'You have no matches in any tournament. Register for a tournament to get started!',
      });
      return;
    }

    // Categorize matches
    const currentMatches: typeof matchPlayers = [];
    const upcomingMatches: typeof matchPlayers = [];
    const recentMatches: typeof matchPlayers = [];

    for (const mp of matchPlayers) {
      const state = mp.match.state;
      if (state === MatchState.IN_PROGRESS || state === MatchState.CALLED || state === MatchState.CHECKED_IN) {
        currentMatches.push(mp);
      } else if (state === MatchState.NOT_STARTED) {
        upcomingMatches.push(mp);
      } else if (state === MatchState.COMPLETED) {
        recentMatches.push(mp);
      }
    }

    // Build the embed
    const embed = new EmbedBuilder()
      .setTitle('🎮 Your Matches')
      .setColor(Colors.Blue);

    // Current match
    if (currentMatches.length > 0) {
      const current = currentMatches[0];
      const opponent = current.match.players.find(p => p.userId !== user.id);
      const opponentName = opponent?.playerName || 'TBD';

      const stateText: Record<MatchState, string> = {
        [MatchState.CALLED]: 'Waiting for check-in',
        [MatchState.CHECKED_IN]: 'Checked in - Waiting to start',
        [MatchState.IN_PROGRESS]: 'In Progress',
        [MatchState.NOT_STARTED]: 'Not Started',
        [MatchState.PENDING_CONFIRMATION]: 'Pending Confirmation',
        [MatchState.COMPLETED]: 'Completed',
        [MatchState.DISPUTED]: 'Disputed',
        [MatchState.DQ]: 'Disqualified',
      };

      let currentMatchText = `**vs ${opponentName}** - ${current.match.roundText}\n`;
      currentMatchText += `Status: ${stateText[current.match.state] || 'Unknown'}`;

      if (current.match.discordThreadId) {
        currentMatchText += `\n[Go to Match Thread](https://discord.com/channels/${interaction.guildId}/${current.match.discordThreadId})`;
      }

      embed.addFields({
        name: 'Current Match',
        value: currentMatchText,
      });
    }

    // Upcoming matches
    if (upcomingMatches.length > 0) {
      const upcomingText = upcomingMatches.slice(0, 5).map(mp => {
        const opponent = mp.match.players.find(p => p.userId !== user.id);
        const opponentName = opponent?.playerName || 'TBD';
        return `• vs ${opponentName} - ${mp.match.roundText}`;
      }).join('\n');

      embed.addFields({
        name: 'Upcoming',
        value: upcomingText,
      });
    }

    // Recent matches
    if (recentMatches.length > 0) {
      const recentText = recentMatches.slice(0, 5).map(mp => {
        const opponent = mp.match.players.find(p => p.userId !== user.id);
        const opponentName = opponent?.playerName || 'TBD';
        const result = mp.isWinner ? '✅ (W)' : '❌ (L)';
        return `• ${result} vs ${opponentName} - ${mp.match.roundText}`;
      }).join('\n');

      embed.addFields({
        name: 'Recent Results',
        value: recentText,
      });
    }

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching matches');
    await interaction.editReply({
      content: 'Failed to fetch your matches. Please try again.',
    });
  }
}

export default command;
