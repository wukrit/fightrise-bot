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
      where: {
        discordGuildId: {
          not: null,
        },
      },
      select: {
        discordGuildId: true,
        guildName: true,
        channels: true,
      },
    });

    // Transform to guild format
    const guilds = guildConfigs
      .filter((config) => config.discordGuildId)
      .map((config) => ({
        id: config.discordGuildId,
        name: config.guildName || 'Unknown Server',
      }));

    // Get unique channels from all guilds
    const channelsSet = new Map<string, string>();
    guildConfigs.forEach((config) => {
      if (config.channels) {
        Object.entries(config.channels).forEach(([id, channel]) => {
          if (!channelsSet.has(id)) {
            channelsSet.set(id, typeof channel === 'string' ? channel : channel.name || 'unknown');
          }
        });
      }
    });

    const channels = Array.from(channelsSet.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    return NextResponse.json({
      guilds,
      channels: channels.length > 0 ? channels : [{ id: '1', name: 'general' }, { id: '2', name: 'tournaments' }],
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
