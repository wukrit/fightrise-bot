import { NextRequest, NextResponse } from 'next/server';
import { prisma, AdminRole } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export interface TournamentAdminCheck {
  userId: string;
  role: AdminRole;
  isAdmin: boolean;
}

/**
 * Verifies the user is an admin for a tournament.
 * Returns 401 if not authenticated, 403 if not admin, or the admin info on success.
 */
export async function requireTournamentAdmin(
  request: NextRequest,
  tournamentId: string
): Promise<TournamentAdminCheck | NextResponse<{ error: string }>> {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Find user by discordId
  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Check tournament admin role
  const adminCheck = await prisma.tournamentAdmin.findFirst({
    where: {
      userId: user.id,
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
    },
  });

  if (!adminCheck) {
    return NextResponse.json(
      { error: 'Only tournament admins can access this resource' },
      { status: 403 }
    );
  }

  return {
    userId: user.id,
    role: adminCheck.role,
    isAdmin: true,
  };
}

/**
 * Require tournament admin for pages (uses params directly)
 */
export async function requireTournamentAdminById(
  tournamentId: string
): Promise<TournamentAdminCheck | NextResponse<{ error: string }>> {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Find user by discordId
  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Check tournament admin role
  const adminCheck = await prisma.tournamentAdmin.findFirst({
    where: {
      userId: user.id,
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
    },
  });

  if (!adminCheck) {
    return NextResponse.json(
      { error: 'Only tournament admins can access this page' },
      { status: 403 }
    );
  }

  return {
    userId: user.id,
    role: adminCheck.role,
    isAdmin: true,
  };
}
