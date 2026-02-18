import { prisma, MatchState, AuditAction, AuditSource } from '@fightrise/database';
import { createAuditLog } from './auditService.js';

/**
 * DQ (Disqualify) a player from a match.
 * Can be used for:
 * - Admin-initiated DQ
 * - No-show (check-in timeout)
 *
 * @param matchId - The match ID
 * @param dqPlayerId - The player ID to disqualify
 * @param reason - Reason for DQ
 * @param adminId - Discord ID of admin performing the action (optional)
 */
export async function dqPlayer(
  matchId: string,
  dqPlayerId: string,
  reason: string,
  adminId?: string
): Promise<{ success: boolean; message: string }> {
  // Fetch match with players
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
    return { success: false, message: 'Match not found.' };
  }

  // Validate match is not already completed
  if (match.state === MatchState.COMPLETED || match.state === MatchState.DQ) {
    return { success: false, message: 'Match is already completed.' };
  }

  // Find the player to DQ
  const dqPlayer = match.players.find((p) => p.id === dqPlayerId);
  if (!dqPlayer) {
    return { success: false, message: 'Player not found in match.' };
  }

  // Find the opponent
  const opponent = match.players.find((p) => p.id !== dqPlayerId);
  if (!opponent) {
    return { success: false, message: 'No opponent found.' };
  }

  // Find admin user if adminId provided
  let adminUserId: string | undefined;
  if (adminId) {
    const adminUser = await prisma.user.findUnique({
      where: { discordId: adminId },
    });
    if (adminUser) {
      adminUserId = adminUser.id;
    }
  }

  // Store before state for audit
  const beforeState = {
    matchState: match.state,
    players: match.players.map((p) => ({
      id: p.id,
      isWinner: p.isWinner,
    })),
  };

  // Update match to DQ state and mark winner
  try {
    await prisma.$transaction(async (tx) => {
      // Update match state with state guard to prevent concurrent modifications
      const updateMatchResult = await tx.match.updateMany({
        where: {
          id: matchId,
          state: { notIn: [MatchState.COMPLETED, MatchState.DQ] },
        },
        data: { state: MatchState.DQ },
      });

      // If no rows updated, match was already completed or DQ'd
      if (updateMatchResult.count === 0) {
        throw new Error('Match has already been completed or DQd');
      }

      // Mark the DQ'd player as loser
      await tx.matchPlayer.update({
        where: { id: dqPlayerId },
        data: { isWinner: false },
      });

      // Mark opponent as winner
      await tx.matchPlayer.update({
        where: { id: opponent.id },
        data: { isWinner: true },
      });

      // Store after state for audit
      const afterState = {
        matchState: MatchState.DQ,
        players: [
          { id: dqPlayerId, isWinner: false, dq: true },
          { id: opponent.id, isWinner: true, dq: false },
        ],
      };

      // Create audit log entry
      if (adminUserId) {
        await createAuditLog({
          action: AuditAction.PLAYER_DQ,
          entityType: 'Match',
          entityId: matchId,
          userId: adminUserId,
          before: beforeState,
          after: afterState,
          reason: reason,
          source: AuditSource.DISCORD,
        });
      }

      // Log admin action if provided
      if (adminId) {
        console.log(`[DQ] Player ${dqPlayer.playerName} DQ'd by admin ${adminId} for match ${match.identifier}: ${reason}`);
      } else {
        console.log(`[DQ] Player ${dqPlayer.playerName} auto-DQ'd for match ${match.identifier}: ${reason}`);
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Match has already been completed or DQd') {
      return { success: false, message: 'Match has already been completed or DQd.' };
    }
    throw error;
  }

  // TODO: Sync to Start.gg
  // TODO: Notify players

  return {
    success: true,
    message: `${dqPlayer.playerName} has been disqualified. ${opponent.playerName} wins by default.`,
  };
}
