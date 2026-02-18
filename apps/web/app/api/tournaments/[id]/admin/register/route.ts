import { NextRequest, NextResponse } from 'next/server';
import { prisma, RegistrationSource, RegistrationStatus, TournamentAdmin, AdminRole } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for admin registration
const adminRegisterSchema = z.object({
  discordId: z.string().min(1, 'Discord ID is required'),
  discordUsername: z.string().min(1, 'Discord username is required'),
});

/**
 * POST /api/tournaments/[id]/admin/register
 * Register a player to a tournament (admin operation)
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

    const { id: tournamentId } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = adminRegisterSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { discordId, discordUsername } = validationResult.data;

    // Find the tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const adminCheck = await prisma.tournamentAdmin.findFirst({
      where: {
        userId: user.id,
        tournamentId,
        role: { in: [AdminRole.OWNER, AdminRole.ADMIN] },
      },
    });

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Only tournament admins can register players' },
        { status: 403 }
      );
    }

    // Find or create the player user
    let player = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!player) {
      player = await prisma.user.create({
        data: {
          discordId,
          discordUsername,
        },
      });
    }

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        userId: player.id,
        tournamentId,
        source: RegistrationSource.MANUAL,
        status: RegistrationStatus.CONFIRMED,
      },
    });

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        userId: registration.userId,
        status: registration.status,
      },
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
