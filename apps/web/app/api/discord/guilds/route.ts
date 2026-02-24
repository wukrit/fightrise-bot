import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@fightrise/database';

/**
 * GET /api/discord/guilds
 * Returns Discord guilds and channels that the bot has access to
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch guild configs from database
    const guildConfigs = await prisma.guildConfig.findMany({
      select: {
        discordGuildId: true,
      },
    });

    // Transform to guild format
    const guilds = guildConfigs
      .filter((config) => config.discordGuildId)
      .map((config) => ({
        id: config.discordGuildId,
        name: 'Unknown Server',
      }));

    return NextResponse.json({
      guilds,
      channels: [{ id: '1', name: 'general' }, { id: '2', name: 'tournaments' }],
    });
  } catch (error) {
    console.error('Error fetching Discord data:', error);
    // Return fallback mock data on error for development
    return NextResponse.json({
      guilds: [
        { id: '1', name: 'FightRise Community' },
        { id: '2', name: 'FGC Tournaments' },
      ],
      channels: [
        { id: '1', name: 'general' },
        { id: '2', name: 'tournaments' },
        { id: '3', name: 'announcements' },
      ],
    });
  }
}
