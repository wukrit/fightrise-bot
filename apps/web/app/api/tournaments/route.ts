import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * GET /api/tournaments
 * Returns a list of tournaments with cursor-based pagination
 * Query params:
 *   - cursor: The cursor for the next page (tournament ID)
 *   - limit: Number of results per page (default 10, max 100)
 *   - state: Filter by tournament state
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.read);

  const headers = createRateLimitHeaders(result);
  if (!result.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE
    );

    const where = state ? { state: state as any } : {};

    // Add cursor condition if provided
    if (cursor) {
      Object.assign(where, {
        id: {
          lt: cursor,
        },
      });
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      include: {
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    // Determine if there's a next page
    const hasMore = tournaments.length > limit;
    const items = hasMore ? tournaments.slice(0, limit) : tournaments;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Get total count for metadata
    const total = await prisma.tournament.count({ where });

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
      total,
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}
