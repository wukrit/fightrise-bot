import {
  Client,
  TextChannel,
  ThreadChannel,
  ThreadAutoArchiveDuration,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { prisma, MatchState, Prisma } from '@fightrise/database';
import { createInteractionId, INTERACTION_PREFIX } from '@fightrise/shared';

// Type for match with players and tournament info
type MatchWithPlayers = Prisma.MatchGetPayload<{
  include: {
    event: { include: { tournament: true } };
    players: { include: { user: true } };
  };
}>;

/**
 * Creates a Discord thread for a match and sends the initial embed with check-in buttons.
 * Returns the thread ID on success, or null if creation fails.
 *
 * This function is idempotent - if the match already has a thread, it returns the existing thread ID.
 */
export async function createMatchThread(
  client: Client,
  matchId: string
): Promise<string | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      event: { include: { tournament: true } },
      players: { include: { user: true } },
    },
  });

  if (!match) {
    console.error(`[MatchService] Match not found: ${matchId}`);
    return null;
  }

  // Idempotency check - return existing thread ID if present
  if (match.discordThreadId) {
    console.log(`[MatchService] Thread already exists for match: ${matchId}`);
    return match.discordThreadId;
  }

  const { tournament } = match.event;
  if (!tournament.discordChannelId) {
    console.error(`[MatchService] No channel configured for tournament: ${tournament.id}`);
    return null;
  }

  // Fetch and validate channel
  let channel;
  try {
    channel = await client.channels.fetch(tournament.discordChannelId);
  } catch {
    console.error(`[MatchService] Failed to fetch channel: ${tournament.discordChannelId}`);
    return null;
  }

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error(`[MatchService] Invalid channel type: ${tournament.discordChannelId}`);
    return null;
  }

  const textChannel = channel as TextChannel;
  const [player1, player2] = match.players;

  if (!player1 || !player2) {
    console.error(`[MatchService] Match ${matchId} does not have 2 players`);
    return null;
  }

  const threadName = formatThreadName(
    match.roundText,
    match.identifier,
    player1.playerName,
    player2.playerName
  );

  // Calculate check-in deadline if check-in is required
  const checkInDeadline = tournament.requireCheckIn
    ? new Date(Date.now() + tournament.checkInWindowMinutes * 60 * 1000)
    : null;

  let thread: ThreadChannel | undefined;
  try {
    // Create thread
    thread = await textChannel.threads.create({
      name: threadName,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    });

    // P1 Fix: Update database immediately after thread creation to prevent orphaned threads
    // P2 Fix: Only transition to CALLED from NOT_STARTED to prevent invalid state regression
    const updateResult = await prisma.match.updateMany({
      where: { id: matchId, state: MatchState.NOT_STARTED },
      data: {
        discordThreadId: thread.id,
        state: MatchState.CALLED,
        checkInDeadline,
      },
    });

    if (updateResult.count === 0) {
      // Match was already in a different state, clean up thread
      console.warn(`[MatchService] Match ${matchId} not in NOT_STARTED state, cleaning up thread`);
      await thread.delete();
      return null;
    }

    // P2 Fix: Add linked players to thread in parallel (failures are non-fatal)
    const playersWithDiscord = match.players.filter(
      (player): player is typeof player & { user: { discordId: string } } =>
        player.user?.discordId != null
    );
    const addPlayerPromises = playersWithDiscord.map((player) =>
      thread!.members.add(player.user.discordId).catch(() => {
        console.warn(`[MatchService] Failed to add player ${player.playerName} to thread`);
      })
    );
    await Promise.allSettled(addPlayerPromises);

    // Build and send embed
    const embed = buildMatchEmbed(match, tournament.requireCheckIn, checkInDeadline);
    const components = tournament.requireCheckIn ? [buildCheckInButtons(matchId)] : [];
    await thread!.send({ embeds: [embed], components });

    console.log(`[MatchService] Thread created for match: ${matchId} (${threadName})`);
    return thread!.id;
  } catch (err) {
    console.error(`[MatchService] Thread creation failed for ${matchId}:`, err);

    // P1 Fix: Clean up orphaned thread if database update failed
    if (thread) {
      try {
        await thread.delete();
        console.log(`[MatchService] Cleaned up orphaned thread for match: ${matchId}`);
      } catch (deleteErr) {
        console.error(`[MatchService] Failed to clean up orphaned thread for ${matchId}:`, deleteErr);
      }
    }

    return null;
  }
}

/**
 * Formats the thread name, truncating player names if needed to fit Discord's 100 char limit.
 * Format: "{roundText} ({identifier}): {player1} vs {player2}"
 */
export function formatThreadName(
  roundText: string,
  identifier: string,
  player1: string,
  player2: string
): string {
  const name = `${roundText} (${identifier}): ${player1} vs ${player2}`;
  if (name.length <= 100) return name;

  // Truncate player names to fit
  const prefix = `${roundText} (${identifier}): `;
  const separator = ' vs ';
  const availableSpace = 100 - prefix.length - separator.length;
  const maxPlayerLen = Math.floor(availableSpace / 2) - 2; // -2 for ".." suffix

  const p1 = player1.length > maxPlayerLen ? player1.slice(0, maxPlayerLen) + '..' : player1;
  const p2 = player2.length > maxPlayerLen ? player2.slice(0, maxPlayerLen) + '..' : player2;

  return `${prefix}${p1}${separator}${p2}`;
}

/**
 * Builds the match embed with player mentions and check-in info.
 */
function buildMatchEmbed(
  match: MatchWithPlayers,
  requireCheckIn: boolean,
  checkInDeadline: Date | null
): EmbedBuilder {
  const [player1, player2] = match.players;

  // Format player mentions - use Discord mention if linked, otherwise just the name
  const p1Mention = player1.user?.discordId
    ? `<@${player1.user.discordId}>`
    : player1.playerName;
  const p2Mention = player2.user?.discordId
    ? `<@${player2.user.discordId}>`
    : player2.playerName;

  const embed = new EmbedBuilder()
    .setTitle(match.roundText)
    .setDescription(`${p1Mention} vs ${p2Mention}`)
    .addFields({ name: 'Match ID', value: match.identifier, inline: true })
    .setColor(0x5865f2); // Discord blurple

  if (requireCheckIn && checkInDeadline) {
    const unix = Math.floor(checkInDeadline.getTime() / 1000);
    embed.addFields(
      { name: 'Status', value: 'Waiting for check-in', inline: true },
      { name: 'Deadline', value: `<t:${unix}:R>`, inline: true }
    );
  } else {
    embed.addFields({ name: 'Status', value: 'Ready to play', inline: true });
  }

  return embed;
}

/**
 * Builds the check-in button row with buttons for both players.
 */
function buildCheckInButtons(matchId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.CHECK_IN, matchId, '1'))
      .setLabel('Check In (Player 1)')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.CHECK_IN, matchId, '2'))
      .setLabel('Check In (Player 2)')
      .setStyle(ButtonStyle.Primary)
  );
}

// ============================================================================
// Agent-Native Functions
// These functions allow agents and automated systems to interact with matches
// ============================================================================

/**
 * Result of a check-in operation
 */
export interface CheckInResult {
  success: boolean;
  message: string;
  bothCheckedIn: boolean;
}

/**
 * Match status for agent queries
 */
export interface MatchStatus {
  id: string;
  identifier: string;
  roundText: string;
  state: MatchState;
  discordThreadId: string | null;
  checkInDeadline: Date | null;
  players: Array<{
    id: string;
    playerName: string;
    isCheckedIn: boolean;
    checkedInAt: Date | null;
    discordId: string | null;
  }>;
}

/**
 * Get the current status of a match
 * Useful for agents to query match state without Discord UI
 */
export async function getMatchStatus(matchId: string): Promise<MatchStatus | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: {
        include: { user: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!match) return null;

  return {
    id: match.id,
    identifier: match.identifier,
    roundText: match.roundText,
    state: match.state,
    discordThreadId: match.discordThreadId,
    checkInDeadline: match.checkInDeadline,
    players: match.players.map((p) => ({
      id: p.id,
      playerName: p.playerName,
      isCheckedIn: p.isCheckedIn,
      checkedInAt: p.checkedInAt,
      discordId: p.user?.discordId ?? null,
    })),
  };
}

/**
 * Check in a player for a match programmatically
 * This is the agent-native equivalent of clicking the check-in button
 *
 * @param matchId - The match ID
 * @param discordId - The Discord ID of the player checking in
 * @returns Result indicating success/failure and whether both players are now checked in
 */
export async function checkInPlayer(
  matchId: string,
  discordId: string
): Promise<CheckInResult> {
  // Fetch match with players
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: {
        include: { user: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!match) {
    return { success: false, message: 'Match not found.', bothCheckedIn: false };
  }

  // Find the player by their linked Discord ID
  const player = match.players.find((p) => p.user?.discordId === discordId);

  if (!player) {
    return {
      success: false,
      message: 'You are not a participant in this match.',
      bothCheckedIn: false,
    };
  }

  // Check if already checked in
  if (player.isCheckedIn) {
    return {
      success: false,
      message: 'You have already checked in!',
      bothCheckedIn: match.players.every((p) => p.isCheckedIn),
    };
  }

  // Check if check-in deadline has passed
  if (match.checkInDeadline && new Date() > match.checkInDeadline) {
    return {
      success: false,
      message: 'Check-in deadline has passed.',
      bothCheckedIn: false,
    };
  }

  // Update player check-in status
  await prisma.matchPlayer.update({
    where: { id: player.id },
    data: {
      isCheckedIn: true,
      checkedInAt: new Date(),
    },
  });

  // Query fresh count to determine if both players are checked in
  const checkedInCount = await prisma.matchPlayer.count({
    where: { matchId, isCheckedIn: true },
  });

  const bothCheckedIn = checkedInCount === 2;

  if (bothCheckedIn) {
    // Update match state to CHECKED_IN
    await prisma.match.update({
      where: { id: matchId },
      data: { state: MatchState.CHECKED_IN },
    });

    return {
      success: true,
      message: 'Checked in! Both players are ready - match can begin!',
      bothCheckedIn: true,
    };
  }

  return {
    success: true,
    message: 'Checked in! Waiting for your opponent.',
    bothCheckedIn: false,
  };
}

/**
 * Get all matches for a user by their Discord ID
 * Useful for agents to show a player their upcoming matches
 */
export async function getPlayerMatches(
  discordId: string,
  options?: { state?: MatchState; limit?: number }
): Promise<MatchStatus[]> {
  const matches = await prisma.match.findMany({
    where: {
      players: {
        some: {
          user: { discordId },
        },
      },
      ...(options?.state && { state: options.state }),
    },
    include: {
      players: {
        include: { user: true },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 10,
  });

  return matches.map((match) => ({
    id: match.id,
    identifier: match.identifier,
    roundText: match.roundText,
    state: match.state,
    discordThreadId: match.discordThreadId,
    checkInDeadline: match.checkInDeadline,
    players: match.players.map((p) => ({
      id: p.id,
      playerName: p.playerName,
      isCheckedIn: p.isCheckedIn,
      checkedInAt: p.checkedInAt,
      discordId: p.user?.discordId ?? null,
    })),
  }));
}
