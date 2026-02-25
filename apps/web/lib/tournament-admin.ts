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
 * Checks if the user is authenticated via NextAuth
 */
async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  });

  return user;
}

/**
 * Verifies the user is an admin for a tournament.
 * Returns 401 if not authenticated, 403 if not admin, or the admin info on success.
 *
 * This is the main authorization helper - use this in API routes.
 */
export async function requireTournamentAdmin(
  request: NextRequest,
  tournamentId: string
): Promise<TournamentAdminCheck | NextResponse<{ error: string }>> {
  // Check authentication
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
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
 * Checks if the user is a tournament admin (without returning NextResponse).
 * Returns null if not authorized.
 */
export async function checkTournamentAdmin(
  tournamentId: string
): Promise<TournamentAdminCheck | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const adminCheck = await prisma.tournamentAdmin.findFirst({
    where: {
      userId: user.id,
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
    },
  });

  if (!adminCheck) {
    return null;
  }

  return {
    userId: user.id,
    role: adminCheck.role,
    isAdmin: true,
  };
}

/**
 * Require tournament admin for pages (uses params directly).
 * Kept for backward compatibility with existing page components.
 */
export async function requireTournamentAdminById(
  tournamentId: string
): Promise<TournamentAdminCheck | NextResponse<{ error: string }>> {
  // Check authentication
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
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
