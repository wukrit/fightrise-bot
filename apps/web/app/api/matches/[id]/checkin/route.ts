import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MatchState } from '@prisma/client';

/**
 * POST /api/matches/[id]/checkin
 * Check in for a match
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the match
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        players: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Check if user is a player in this match
    const userPlayer = match.players.find((p) => p.userId === user.id);

    if (!userPlayer) {
      return NextResponse.json(
        { error: 'Not authorized to check in for this match' },
        { status: 403 }
      );
    }

    // Check if already checked in
    if (userPlayer.isCheckedIn) {
      return NextResponse.json(
        { error: 'Already checked in' },
        { status: 400 }
      );
    }

    // Check if match is in a valid state for check-in
    const validCheckInStates: MatchState[] = [MatchState.CALLED, MatchState.CHECKED_IN];

    if (!validCheckInStates.includes(match.state)) {
      return NextResponse.json(
        { error: 'Match is not in a state that allows check-in' },
        { status: 400 }
      );
    }

    // Update the match player's check-in status and determine match state in a transaction
    // Use atomic updateMany with state guards to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Use updateMany with state guard for optimistic locking
      const matchUpdate = await tx.match.updateMany({
        where: { id, state: { in: validCheckInStates } },
        data: {
          state: MatchState.CHECKED_IN,
        },
      });

      // If no rows updated, match is not in a state that allows check-in (race condition - another request already processed)
      if (matchUpdate.count === 0) {
        throw new Error('INVALID_STATE');
      }

      // Update the current player's check-in status
      await tx.matchPlayer.update({
        where: { id: userPlayer.id },
        data: {
          isCheckedIn: true,
          checkedInAt: new Date(),
        },
      });

      // Re-fetch match with players to check if both have checked in
      const updatedMatch = await tx.match.findUnique({
        where: { id },
        include: {
          players: true,
        },
      });

      if (!updatedMatch) {
        throw new Error('Match not found');
      }

      // Check if both players have checked in
      const allCheckedIn = updatedMatch.players.every((p) => p.isCheckedIn);

      if (allCheckedIn) {
        // Both players checked in - transition to IN_PROGRESS
        await tx.match.updateMany({
          where: { id, state: MatchState.CHECKED_IN },
          data: { state: MatchState.IN_PROGRESS },
        });
        return { state: MatchState.IN_PROGRESS };
      }

      // Only this player checked in - stay in CHECKED_IN state
      return { state: MatchState.CHECKED_IN };
    });

    return NextResponse.json({ success: true, state: result.state });
  } catch (error: unknown) {
    console.error('Error checking in:', error);

    // Handle specific race condition errors
    if (error instanceof Error) {
      if (error.message === 'INVALID_STATE') {
        return NextResponse.json(
          { error: 'Match is not in a state that allows check-in' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    );
  }
}
