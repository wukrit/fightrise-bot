/**
 * Mock API response factories for E2E tests.
 *
 * These factories generate correctly formatted API responses that match
 * the actual Prisma/Next.js API response structures.
 */

import { Page } from '@playwright/test';
import { TournamentState, EventState, MatchState, RegistrationStatus, RegistrationSource, AdminRole, AuditAction, AuditSource } from '@prisma/client';

/**
 * Setup fetch interception for API mocking using addInitScript.
 *
 * This is needed because page.route() doesn't intercept SSR requests.
 * addInitScript runs before the page loads, allowing us to intercept
 * fetch requests during server-side rendering.
 *
 * @param page - Playwright page
 * @param mocks - Record of URL patterns to mock responses
 *
 * @example
 * ```ts
 * await setupApiMocks(page, {
 *   '/api/matches': { matches: [...] },
 *   '/api/tournaments': { items: [...] },
 * });
 * await page.goto('/matches');
 * ```
 */
export async function setupApiMocks(page: Page, mocks: Record<string, any>): Promise<void> {
  await page.addInitScript((mockData) => {
    // Store mock data in window for access
    (window as any).__E2E_API_MOCKS__ = mockData;

    // Override fetch to intercept API calls
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const urlObj = new URL(url, 'http://localhost:3000');
      const pathname = urlObj.pathname;

      // Check if this URL matches any mock
      for (const [pattern, response] of Object.entries((window as any).__E2E_API_MOCKS__)) {
        if (pathname.startsWith(pattern)) {
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Not matched - use original fetch
      return originalFetch(input, init);
    };
  }, mocks);
}

/**
 * Setup match API mocks specifically.
 * Convenience wrapper for /api/matches/* endpoints.
 *
 * @param page - Playwright page
 * @param matchData - Match data to return
 */
export async function setupMatchApiMocks(page: Page, matchData: any): Promise<void> {
  await setupApiMocks(page, {
    '/api/matches': matchData,
    '/api/matches/': matchData,
  });
}

/**
 * Setup tournament API mocks specifically.
 * Convenience wrapper for /api/tournaments/* endpoints.
 *
 * @param page - Playwright page
 * @param tournamentData - Tournament data to return
 */
export async function setupTournamentApiMocks(page: Page, tournamentData: any): Promise<void> {
  await setupApiMocks(page, {
    '/api/tournaments': tournamentData,
    '/api/tournaments/': tournamentData,
  });
}

/**
 * Generate a tournament object matching the Prisma model + API transformation.
 */
export function createMockTournamentAPIResponse(overrides?: {
  id?: string;
  name?: string;
  state?: TournamentState;
  startggSlug?: string;
  startAt?: Date | string;
  endAt?: Date | string;
  discordGuildId?: string | null;
  discordChannelId?: string | null;
  numEntrants?: number;
}): object {
  const now = new Date();
  const startAt = overrides?.startAt || now;
  const endAt = overrides?.endAt || new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  return {
    id: overrides?.id || 'test-tournament-cuid-1',
    startggId: 'test-startgg-123',
    startggSlug: overrides?.startggSlug || 'test-tournament',
    name: overrides?.name || 'Test Tournament',
    startAt: startAt instanceof Date ? startAt.toISOString() : startAt,
    endAt: endAt instanceof Date ? endAt.toISOString() : endAt,
    state: overrides?.state || TournamentState.REGISTRATION_OPEN,
    discordGuildId: overrides?.discordGuildId || null,
    discordChannelId: overrides?.discordChannelId || null,
    autoCreateThreads: true,
    requireCheckIn: true,
    checkInWindowMinutes: 10,
    allowSelfReporting: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastPolledAt: null,
    pollIntervalMs: 30000,
    _count: {
      registrations: overrides?.numEntrants || 0,
    },
  };
}

/**
 * Generate response for GET /api/tournaments
 * Returns: { items: [], nextCursor, hasMore, total }
 */
export function createTournamentsListResponse(tournaments: object[], options?: {
  nextCursor?: string | null;
  hasMore?: boolean;
  total?: number;
}) {
  return {
    items: tournaments,
    nextCursor: options?.nextCursor || null,
    hasMore: options?.hasMore || false,
    total: options?.total || tournaments.length,
  };
}

/**
 * Generate response for GET /api/tournaments/me
 * Returns: array directly (not wrapped in object)
 */
export function createUserTournamentsResponse(tournaments: object[]) {
  return tournaments;
}

/**
 * Generate a registration object matching the API response format.
 */
export function createMockRegistrationAPIResponse(overrides?: {
  id?: string;
  userId?: string;
  tournamentId?: string;
  status?: RegistrationStatus;
  source?: RegistrationSource;
  user?: object;
}): object {
  return {
    id: overrides?.id || 'test-registration-cuid-1',
    userId: overrides?.userId || 'test-user-cuid-1',
    tournamentId: overrides?.tournamentId || 'test-tournament-cuid-1',
    eventId: 'test-event-cuid-1',
    source: overrides?.source || RegistrationSource.DISCORD,
    status: overrides?.status || RegistrationStatus.CONFIRMED,
    displayName: null,
    startggEntrantId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(overrides?.user && { user: overrides.user }),
  };
}

/**
 * Generate response for GET /api/tournaments/[id]/admin/registrations
 * Returns: { registrations: [], pagination: {} }
 */
export function createRegistrationsListResponse(registrations: object[], options?: {
  page?: number;
  limit?: number;
  total?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const total = options?.total || registrations.length;

  return {
    registrations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Generate a match object matching the API response format.
 */
export function createMockMatchAPIResponse(overrides?: {
  id?: string;
  eventId?: string;
  state?: MatchState;
  round?: number;
  identifier?: string;
  roundText?: string;
  players?: object[];
}): object {
  return {
    id: overrides?.id || 'test-match-cuid-1',
    startggSetId: 'test-set-123',
    identifier: overrides?.identifier || 'A1',
    roundText: overrides?.roundText || 'Winners Round 1',
    round: overrides?.round || 1,
    state: overrides?.state || MatchState.NOT_STARTED,
    discordThreadId: null,
    discordMessageId: null,
    checkInDeadline: null,
    startggSyncStatus: 'NOT_SYNCED',
    startggSyncError: null,
    eventId: overrides?.eventId || 'test-event-cuid-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    event: {
      id: 'test-event-cuid-1',
      tournamentId: 'test-tournament-cuid-1',
      name: 'Street Fighter 6 - Main',
    },
    players: overrides?.players || [],
  };
}

/**
 * Generate response for GET /api/tournaments/[id]/admin/matches
 * Returns: { matches: [], pagination: {} }
 */
export function createMatchesListResponse(matches: object[], options?: {
  page?: number;
  limit?: number;
  total?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const total = options?.total || matches.length;

  return {
    matches,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Generate an audit log object matching the API response format.
 */
export function createMockAuditLogAPIResponse(overrides?: {
  id?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  user?: object;
  reason?: string | null;
  source?: AuditSource;
}): object {
  const now = new Date();
  return {
    id: overrides?.id || 'test-audit-log-cuid-1',
    action: overrides?.action || AuditAction.TOURNAMENT_CREATED,
    entityType: overrides?.entityType || 'Tournament',
    entityId: overrides?.entityId || 'test-tournament-cuid-1',
    userId: overrides?.userId || 'test-user-cuid-1',
    user: overrides?.user || {
      id: 'test-user-cuid-1',
      discordId: '123456789012345678',
      discordUsername: 'TestUser',
      startggId: null,
      startggGamerTag: null,
    },
    before: null,
    after: { name: 'Test Tournament' },
    reason: overrides?.reason || null,
    source: overrides?.source || AuditSource.WEB,
    createdAt: now.toISOString(),
  };
}

/**
 * Generate response for GET /api/tournaments/[id]/admin/audit
 * Returns: { logs: [], pagination: {} }
 */
export function createAuditLogsListResponse(logs: object[], options?: {
  page?: number;
  limit?: number;
  total?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const total = options?.total || logs.length;

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Generate user profile response matching /api/user/profile
 */
export function createUserProfileResponse(overrides?: {
  id?: string;
  discordUsername?: string;
  discordAvatar?: string | null;
  startggId?: string | null;
  startggGamerTag?: string | null;
  startggSlug?: string | null;
}): object {
  return {
    id: overrides?.id || 'test-user-cuid-1',
    discordUsername: overrides?.discordUsername || 'TestUser',
    discordAvatar: overrides?.discordAvatar || null,
    startggId: overrides?.startggId || null,
    startggGamerTag: overrides?.startggGamerTag || null,
    startggSlug: overrides?.startggSlug || null,
  };
}

/**
 * Generate tournament detail response for /api/tournaments/[id]
 */
export function createTournamentDetailResponse(overrides?: object): object {
  return {
    ...createMockTournamentAPIResponse(overrides?.id ? { id: overrides.id as string } : undefined),
    ...overrides,
  };
}
