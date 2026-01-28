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
import {
  createInteractionId,
  INTERACTION_PREFIX,
  DISCORD_LIMITS,
  DISCORD_COLORS,
  TIME,
} from '@fightrise/shared';

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
    ? new Date(Date.now() + tournament.checkInWindowMinutes * TIME.MINUTES_TO_MS)
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
    const sentMessage = await thread!.send({ embeds: [embed], components });

    // Store the message ID for future embed updates (e.g., from BullMQ jobs)
    await prisma.match.update({
      where: { id: matchId },
      data: { discordMessageId: sentMessage.id },
    });

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
  if (name.length <= DISCORD_LIMITS.THREAD_NAME_MAX_LENGTH) return name;

  // Truncate player names to fit
  const prefix = `${roundText} (${identifier}): `;
  const separator = ' vs ';
  const availableSpace = DISCORD_LIMITS.THREAD_NAME_MAX_LENGTH - prefix.length - separator.length;
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
    .setColor(DISCORD_COLORS.BLURPLE);

  if (requireCheckIn && checkInDeadline) {
    const unix = Math.floor(checkInDeadline.getTime() / TIME.SECONDS_TO_MS);
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
  /** Match status included on successful check-in to avoid duplicate DB queries */
  matchStatus?: MatchStatus;
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
    isWinner?: boolean | null;
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
    console.warn(`[CheckIn] Match not found: ${matchId} (user: ${discordId})`);
    return { success: false, message: 'Match not found.', bothCheckedIn: false };
  }

  // Validate match is in CALLED state (check-in window is active)
  if (match.state !== MatchState.CALLED) {
    console.warn(
      `[CheckIn] Invalid state: ${discordId} attempted check-in for ${match.identifier} in state ${match.state}`
    );
    return {
      success: false,
      message: 'Check-in is not available for this match.',
      bothCheckedIn: false,
    };
  }

  // Find the player by their linked Discord ID
  const player = match.players.find((p) => p.user?.discordId === discordId);

  if (!player) {
    console.warn(
      `[CheckIn] User not in match: ${discordId} attempted check-in for ${match.identifier}`
    );
    return {
      success: false,
      message: 'You are not a participant in this match.',
      bothCheckedIn: false,
    };
  }

  // Check if already checked in
  if (player.isCheckedIn) {
    console.log(
      `[CheckIn] Duplicate attempt: ${player.playerName} already checked in for ${match.identifier}`
    );
    return {
      success: false,
      message: 'You have already checked in!',
      bothCheckedIn: match.players.every((p) => p.isCheckedIn),
    };
  }

  // Check if check-in deadline has passed
  if (match.checkInDeadline && new Date() > match.checkInDeadline) {
    console.warn(
      `[CheckIn] Deadline passed: ${player.playerName} attempted late check-in for ${match.identifier}`
    );
    return {
      success: false,
      message: 'Check-in deadline has passed.',
      bothCheckedIn: false,
    };
  }

  // Use transaction with optimistic locking to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    // Atomic update - only succeeds if player is not already checked in
    const updated = await tx.matchPlayer.updateMany({
      where: { id: player.id, isCheckedIn: false },
      data: {
        isCheckedIn: true,
        checkedInAt: new Date(),
      },
    });

    // If no rows updated, player was already checked in (concurrent request)
    if (updated.count === 0) {
      return { success: false, bothCheckedIn: false, alreadyCheckedIn: true };
    }

    // Count checked-in players within the transaction
    const checkedInCount = await tx.matchPlayer.count({
      where: { matchId, isCheckedIn: true },
    });

    const bothCheckedIn = checkedInCount === 2;

    if (bothCheckedIn) {
      // Use updateMany with state guard to prevent duplicate transitions
      const matchUpdated = await tx.match.updateMany({
        where: { id: matchId, state: MatchState.CALLED },
        data: { state: MatchState.CHECKED_IN },
      });

      if (matchUpdated.count === 0) {
        console.log(`[CheckIn] Match ${match.identifier} state already transitioned by concurrent request`);
      }
    }

    return { success: true, bothCheckedIn, alreadyCheckedIn: false };
  });

  // Handle the case where concurrent request already checked in
  if (result.alreadyCheckedIn) {
    console.log(
      `[CheckIn] Concurrent check-in detected: ${player.playerName} for ${match.identifier}`
    );
    return {
      success: false,
      message: 'You have already checked in!',
      bothCheckedIn: result.bothCheckedIn,
    };
  }

  // Build match status from already-fetched data (avoids duplicate query)
  const buildMatchStatus = (): MatchStatus => ({
    id: match.id,
    identifier: match.identifier,
    roundText: match.roundText,
    state: result.bothCheckedIn ? MatchState.CHECKED_IN : match.state,
    discordThreadId: match.discordThreadId,
    checkInDeadline: match.checkInDeadline,
    players: match.players.map((p) => ({
      id: p.id,
      playerName: p.playerName,
      // Update check-in status: the current player just checked in
      isCheckedIn: p.id === player.id ? true : p.isCheckedIn,
      checkedInAt: p.id === player.id ? new Date() : p.checkedInAt,
      discordId: p.user?.discordId ?? null,
    })),
  });

  if (result.bothCheckedIn) {
    console.log(
      `[CheckIn] Match ready: ${match.identifier} - both players checked in`
    );
    return {
      success: true,
      message: 'Checked in! Both players are ready - match can begin!',
      bothCheckedIn: true,
      matchStatus: buildMatchStatus(),
    };
  }

  console.log(
    `[CheckIn] Success: ${player.playerName} checked in for ${match.identifier} (waiting for opponent)`
  );
  return {
    success: true,
    message: 'Checked in! Waiting for your opponent.',
    bothCheckedIn: false,
    matchStatus: buildMatchStatus(),
  };
}

// ============================================================================
// Score Reporting Functions
// ============================================================================

/**
 * Result of a score report operation
 */
export interface ReportResult {
  success: boolean;
  message: string;
  /** Whether this was a loser confirmation (auto-completed) vs self-report (needs confirmation) */
  autoCompleted: boolean;
  /** Match status included on success for UI updates */
  matchStatus?: MatchStatus;
}

/**
 * Result of a score confirmation operation
 */
export interface ConfirmResult {
  success: boolean;
  message: string;
  /** Match status included on success for UI updates */
  matchStatus?: MatchStatus;
}

/**
 * Report a match result.
 * - If the reporter claims their opponent won (loser confirmation), auto-complete the match
 * - If the reporter claims themselves as winner (self-report), wait for opponent confirmation
 *
 * @param matchId - The match ID
 * @param discordId - Discord ID of the player reporting
 * @param winnerSlot - 1 or 2, indicating which player won
 */
export async function reportScore(
  matchId: string,
  discordId: string,
  winnerSlot: number
): Promise<ReportResult> {
  // Validate slot
  if (winnerSlot !== 1 && winnerSlot !== 2) {
    return { success: false, message: 'Invalid winner selection.', autoCompleted: false };
  }

  // Fetch match with players and event info for Start.gg sync
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: {
        include: { user: true },
        orderBy: { id: 'asc' },
      },
      event: { include: { tournament: true } },
    },
  });

  if (!match) {
    console.warn(`[ReportScore] Match not found: ${matchId} (user: ${discordId})`);
    return { success: false, message: 'Match not found.', autoCompleted: false };
  }

  // Validate match is in correct state
  if (match.state === MatchState.COMPLETED) {
    return { success: false, message: 'This match has already been completed.', autoCompleted: false };
  }

  if (match.state === MatchState.PENDING_CONFIRMATION) {
    return { success: false, message: 'A result has already been reported. Waiting for confirmation.', autoCompleted: false };
  }

  if (match.state !== MatchState.CHECKED_IN) {
    return { success: false, message: 'Score reporting is not available for this match.', autoCompleted: false };
  }

  // Find reporter by Discord ID
  const reporter = match.players.find((p) => p.user?.discordId === discordId);
  if (!reporter) {
    console.warn(`[ReportScore] User not in match: ${discordId} for ${match.identifier}`);
    return { success: false, message: 'You are not a participant in this match.', autoCompleted: false };
  }

  // Determine winner and loser
  const [player1, player2] = match.players;
  if (!player1 || !player2) {
    return { success: false, message: 'Match does not have two players.', autoCompleted: false };
  }

  const winner = winnerSlot === 1 ? player1 : player2;
  const loser = winnerSlot === 1 ? player2 : player1;

  // Is this a self-report (reporter claims they won) or loser confirmation (reporter says opponent won)?
  const isSelfReport = reporter.id === winner.id;

  if (isSelfReport) {
    // Self-report: transition to PENDING_CONFIRMATION, wait for opponent
    const result = await prisma.$transaction(async (tx) => {
      // Atomic update with state guard
      const updated = await tx.match.updateMany({
        where: { id: matchId, state: MatchState.CHECKED_IN },
        data: { state: MatchState.PENDING_CONFIRMATION },
      });

      if (updated.count === 0) {
        return { success: false, reason: 'STATE_CHANGED' };
      }

      // Mark claimed winner
      await tx.matchPlayer.update({
        where: { id: winner.id },
        data: { isWinner: true },
      });

      return { success: true };
    });

    if (!result.success) {
      return { success: false, message: 'Match state changed. Please try again.', autoCompleted: false };
    }

    console.log(`[ReportScore] Self-report: ${reporter.playerName} claims win for ${match.identifier}`);

    return {
      success: true,
      message: `You reported yourself as the winner. Waiting for ${loser.playerName} to confirm.`,
      autoCompleted: false,
      matchStatus: {
        id: match.id,
        identifier: match.identifier,
        roundText: match.roundText,
        state: MatchState.PENDING_CONFIRMATION,
        discordThreadId: match.discordThreadId,
        checkInDeadline: match.checkInDeadline,
        players: match.players.map((p) => ({
          id: p.id,
          playerName: p.playerName,
          isCheckedIn: p.isCheckedIn,
          checkedInAt: p.checkedInAt,
          discordId: p.user?.discordId ?? null,
          isWinner: p.id === winner.id ? true : null,
        })),
      },
    };
  } else {
    // Loser confirmation: auto-complete the match
    const result = await prisma.$transaction(async (tx) => {
      // Atomic update with state guard
      const updated = await tx.match.updateMany({
        where: { id: matchId, state: MatchState.CHECKED_IN },
        data: { state: MatchState.COMPLETED },
      });

      if (updated.count === 0) {
        return { success: false, reason: 'STATE_CHANGED' };
      }

      // Mark winner
      await tx.matchPlayer.update({
        where: { id: winner.id },
        data: { isWinner: true },
      });

      // Mark loser
      await tx.matchPlayer.update({
        where: { id: loser.id },
        data: { isWinner: false },
      });

      return { success: true };
    });

    if (!result.success) {
      return { success: false, message: 'Match state changed. Please try again.', autoCompleted: false };
    }

    // Sync to Start.gg (fire and forget - don't block Discord response)
    syncToStartGG(match.startggSetId, winner.startggEntrantId).catch((err) => {
      console.error(`[ReportScore] Start.gg sync failed for ${match.identifier}:`, err);
    });

    console.log(`[ReportScore] Loser confirmed: ${reporter.playerName} confirms ${winner.playerName} won ${match.identifier}`);

    return {
      success: true,
      message: `Match complete! ${winner.playerName} wins.`,
      autoCompleted: true,
      matchStatus: {
        id: match.id,
        identifier: match.identifier,
        roundText: match.roundText,
        state: MatchState.COMPLETED,
        discordThreadId: match.discordThreadId,
        checkInDeadline: match.checkInDeadline,
        players: match.players.map((p) => ({
          id: p.id,
          playerName: p.playerName,
          isCheckedIn: p.isCheckedIn,
          checkedInAt: p.checkedInAt,
          discordId: p.user?.discordId ?? null,
          isWinner: p.id === winner.id ? true : false,
        })),
      },
    };
  }
}

/**
 * Confirm or dispute a reported match result.
 * Only the opponent (non-reporter) can confirm or dispute.
 *
 * @param matchId - The match ID
 * @param discordId - Discord ID of the player confirming/disputing
 * @param confirmed - true to confirm, false to dispute
 */
export async function confirmResult(
  matchId: string,
  discordId: string,
  confirmed: boolean
): Promise<ConfirmResult> {
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
    return { success: false, message: 'Match not found.' };
  }

  // Validate state
  if (match.state !== MatchState.PENDING_CONFIRMATION) {
    if (match.state === MatchState.COMPLETED) {
      return { success: false, message: 'This match has already been completed.' };
    }
    return { success: false, message: 'No result pending confirmation.' };
  }

  // Find the user
  const user = match.players.find((p) => p.user?.discordId === discordId);
  if (!user) {
    return { success: false, message: 'You are not a participant in this match.' };
  }

  // Find reporter (the one who claimed to win)
  const reporter = match.players.find((p) => p.isWinner === true);
  if (!reporter) {
    return { success: false, message: 'No pending report found.' };
  }

  // Only opponent can confirm/dispute
  if (user.id === reporter.id) {
    return { success: false, message: 'You cannot confirm your own report.' };
  }

  const opponent = user; // The one confirming/disputing
  const winner = reporter;
  const loser = opponent;

  if (confirmed) {
    // Confirm: complete the match
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.match.updateMany({
        where: { id: matchId, state: MatchState.PENDING_CONFIRMATION },
        data: { state: MatchState.COMPLETED },
      });

      if (updated.count === 0) {
        return { success: false, reason: 'STATE_CHANGED' };
      }

      // Mark loser
      await tx.matchPlayer.update({
        where: { id: loser.id },
        data: { isWinner: false },
      });

      return { success: true };
    });

    if (!result.success) {
      return { success: false, message: 'Match state changed. Please try again.' };
    }

    // Sync to Start.gg
    syncToStartGG(match.startggSetId, winner.startggEntrantId).catch((err) => {
      console.error(`[ConfirmResult] Start.gg sync failed for ${match.identifier}:`, err);
    });

    console.log(`[ConfirmResult] Confirmed: ${opponent.playerName} confirms ${winner.playerName} won ${match.identifier}`);

    return {
      success: true,
      message: `Match complete! ${winner.playerName} wins.`,
      matchStatus: {
        id: match.id,
        identifier: match.identifier,
        roundText: match.roundText,
        state: MatchState.COMPLETED,
        discordThreadId: match.discordThreadId,
        checkInDeadline: match.checkInDeadline,
        players: match.players.map((p) => ({
          id: p.id,
          playerName: p.playerName,
          isCheckedIn: p.isCheckedIn,
          checkedInAt: p.checkedInAt,
          discordId: p.user?.discordId ?? null,
          isWinner: p.id === winner.id ? true : false,
        })),
      },
    };
  } else {
    // Dispute: keep in PENDING_CONFIRMATION, post message
    console.log(`[ConfirmResult] Disputed: ${opponent.playerName} disputes ${winner.playerName}'s claim for ${match.identifier}`);

    return {
      success: true,
      message: `${opponent.playerName} disputes the result. Please discuss in the thread and try again, or contact a tournament organizer.`,
      matchStatus: {
        id: match.id,
        identifier: match.identifier,
        roundText: match.roundText,
        state: MatchState.PENDING_CONFIRMATION,
        discordThreadId: match.discordThreadId,
        checkInDeadline: match.checkInDeadline,
        players: match.players.map((p) => ({
          id: p.id,
          playerName: p.playerName,
          isCheckedIn: p.isCheckedIn,
          checkedInAt: p.checkedInAt,
          discordId: p.user?.discordId ?? null,
          isWinner: p.isWinner,
        })),
      },
    };
  }
}

/**
 * Sync match result to Start.gg
 * This is a fire-and-forget helper that logs errors but doesn't throw
 */
async function syncToStartGG(setId: string, winnerEntrantId: string | null): Promise<void> {
  if (!winnerEntrantId) {
    console.warn(`[StartGGSync] No entrant ID for winner, skipping sync for set ${setId}`);
    return;
  }

  // Import StartGGClient dynamically to avoid circular deps
  const { StartGGClient } = await import('@fightrise/startgg-client');

  const apiKey = process.env.STARTGG_API_KEY;
  if (!apiKey) {
    console.error('[StartGGSync] STARTGG_API_KEY not configured');
    return;
  }

  const client = new StartGGClient({ apiKey });

  try {
    const result = await client.reportSet(setId, winnerEntrantId);
    console.log(`[StartGGSync] Reported set ${setId} winner ${winnerEntrantId}, result:`, result);
  } catch (err) {
    console.error(`[StartGGSync] Failed to report set ${setId}:`, err);
    // Don't throw - this is fire-and-forget
  }
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
