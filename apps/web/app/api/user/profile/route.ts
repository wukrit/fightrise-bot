import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@fightrise/database';

/**
 * GET /api/user/profile
 * Returns the current user's profile
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      return NextResponse.json({
        id: '',
        discordUsername: session.user.name || 'Unknown',
        discordAvatar: session.user.image,
        startggId: null,
        startggGamerTag: null,
        startggSlug: null,
      });
    }

    return NextResponse.json({
      id: user.id,
      discordUsername: user.discordUsername || session.user.name || 'Unknown',
      discordAvatar: user.discordAvatar || session.user.image,
      startggId: user.startggId,
      startggGamerTag: user.startggGamerTag,
      startggSlug: user.startggSlug,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
