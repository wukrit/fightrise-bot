/**
 * Test fixtures for Start.gg API responses.
 * These match the exact structure returned by the Start.gg GraphQL API.
 */

import type {
  Tournament,
  Event,
  Set,
  Entrant,
  Connection,
  PageInfo,
  SetSlot,
} from '../types.js';

// ============================================
// Page Info Fixtures
// ============================================

export function createPageInfo(overrides: Partial<PageInfo> = {}): PageInfo {
  return {
    total: 10,
    totalPages: 1,
    page: 1,
    perPage: 50,
    ...overrides,
  };
}

// ============================================
// User Fixtures
// ============================================

export const mockUsers = {
  player1: {
    id: 'user-1',
    slug: 'user/player1',
    name: 'Player1',
  },
  player2: {
    id: 'user-2',
    slug: 'user/player2',
    name: 'Player2',
  },
  player3: {
    id: 'user-3',
    slug: 'user/player3',
    name: 'Player3',
  },
  player4: {
    id: 'user-4',
    slug: 'user/player4',
    name: 'Player4',
  },
};

// ============================================
// Entrant Fixtures
// ============================================

export const mockEntrants: Record<string, Entrant> = {
  entrant1: {
    id: 'entrant-1',
    name: 'Player1',
    participants: [{ user: mockUsers.player1 }],
  },
  entrant2: {
    id: 'entrant-2',
    name: 'Player2',
    participants: [{ user: mockUsers.player2 }],
  },
  entrant3: {
    id: 'entrant-3',
    name: 'Player3',
    participants: [{ user: mockUsers.player3 }],
  },
  entrant4: {
    id: 'entrant-4',
    name: 'Player4',
    participants: [{ user: mockUsers.player4 }],
  },
};

export function createEntrant(overrides: Partial<Entrant> = {}): Entrant {
  const id = overrides.id ?? `entrant-${Date.now()}`;
  return {
    id,
    name: `Test Player ${id}`,
    participants: [{ user: { id: `user-${id}`, slug: `user/${id}`, name: `TestPlayer${id}` } }],
    ...overrides,
  };
}

// ============================================
// Set Slot Fixtures
// ============================================

export function createSetSlot(
  entrant: Entrant | null,
  score: number | null = null
): SetSlot {
  return {
    entrant,
    standing: score !== null ? { stats: { score: { value: score } } } : null,
  };
}

// ============================================
// Set (Match) Fixtures
// ============================================

// Set states from Start.gg API
export const SET_STATE = {
  CREATED: 1,
  ACTIVE: 2,
  COMPLETED: 3,
  READY: 6,
  STARTED: 7,
} as const;

export const mockSets: Record<string, Set> = {
  pendingSet: {
    id: 'set-1',
    state: SET_STATE.READY,
    fullRoundText: 'Winners Round 1',
    identifier: 'A1',
    round: 1,
    slots: [
      createSetSlot(mockEntrants.entrant1),
      createSetSlot(mockEntrants.entrant2),
    ],
  },
  activeSet: {
    id: 'set-2',
    state: SET_STATE.STARTED,
    fullRoundText: 'Winners Round 1',
    identifier: 'A2',
    round: 1,
    slots: [
      createSetSlot(mockEntrants.entrant3),
      createSetSlot(mockEntrants.entrant4),
    ],
  },
  completedSet: {
    id: 'set-3',
    state: SET_STATE.COMPLETED,
    fullRoundText: 'Winners Round 1',
    identifier: 'A3',
    round: 1,
    slots: [
      createSetSlot(mockEntrants.entrant1, 2),
      createSetSlot(mockEntrants.entrant3, 1),
    ],
  },
  grandFinals: {
    id: 'set-4',
    state: SET_STATE.READY,
    fullRoundText: 'Grand Finals',
    identifier: 'GF',
    round: 5,
    slots: [
      createSetSlot(mockEntrants.entrant1),
      createSetSlot(mockEntrants.entrant2),
    ],
  },
};

export function createSet(overrides: Partial<Set> = {}): Set {
  const id = overrides.id ?? `set-${Date.now()}`;
  return {
    id,
    state: SET_STATE.READY,
    fullRoundText: 'Winners Round 1',
    identifier: 'A1',
    round: 1,
    slots: [
      createSetSlot(createEntrant()),
      createSetSlot(createEntrant()),
    ],
    ...overrides,
  };
}

// ============================================
// Event Fixtures
// ============================================

// Event states from Start.gg API
export const EVENT_STATE = {
  CREATED: 'CREATED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const;

export const mockEvents: Record<string, Event> = {
  streetFighter: {
    id: 'event-1',
    name: 'Street Fighter 6',
    numEntrants: 32,
    state: EVENT_STATE.ACTIVE,
  },
  tekken: {
    id: 'event-2',
    name: 'Tekken 8',
    numEntrants: 24,
    state: EVENT_STATE.ACTIVE,
  },
  guiltyGear: {
    id: 'event-3',
    name: 'Guilty Gear Strive',
    numEntrants: 16,
    state: EVENT_STATE.CREATED,
  },
};

export function createEvent(overrides: Partial<Event> = {}): Event {
  const id = overrides.id ?? `event-${Date.now()}`;
  return {
    id,
    name: `Test Event ${id}`,
    numEntrants: 16,
    state: EVENT_STATE.ACTIVE,
    ...overrides,
  };
}

// ============================================
// Tournament Fixtures
// ============================================

// Tournament states from Start.gg API
export const TOURNAMENT_STATE = {
  CREATED: 1,
  ACTIVE: 2,
  COMPLETED: 3,
} as const;

export const mockTournaments: Record<string, Tournament> = {
  weeklyLocal: {
    id: 'tournament-1',
    name: 'FGC Weekly #42',
    slug: 'tournament/fgc-weekly-42',
    startAt: Date.now() / 1000 + 86400, // Tomorrow
    endAt: Date.now() / 1000 + 90000,
    state: TOURNAMENT_STATE.CREATED,
    events: [mockEvents.streetFighter, mockEvents.tekken],
  },
  majorTournament: {
    id: 'tournament-2',
    name: 'Fighting Game Major 2024',
    slug: 'tournament/fighting-game-major-2024',
    startAt: Date.now() / 1000 - 3600, // Started 1 hour ago
    endAt: Date.now() / 1000 + 86400,
    state: TOURNAMENT_STATE.ACTIVE,
    events: [mockEvents.streetFighter, mockEvents.tekken, mockEvents.guiltyGear],
  },
  completedTournament: {
    id: 'tournament-3',
    name: 'Last Month Tournament',
    slug: 'tournament/last-month-tournament',
    startAt: Date.now() / 1000 - 604800, // A week ago
    endAt: Date.now() / 1000 - 518400,
    state: TOURNAMENT_STATE.COMPLETED,
    events: [mockEvents.streetFighter],
  },
};

export function createTournament(overrides: Partial<Tournament> = {}): Tournament {
  const id = overrides.id ?? `tournament-${Date.now()}`;
  return {
    id,
    name: `Test Tournament ${id}`,
    slug: `tournament/test-${id}`,
    startAt: Date.now() / 1000 + 86400,
    endAt: Date.now() / 1000 + 90000,
    state: TOURNAMENT_STATE.CREATED,
    events: [createEvent()],
    ...overrides,
  };
}

// ============================================
// Connection Helpers
// ============================================

export function createConnection<T>(
  nodes: T[],
  pageInfo?: Partial<PageInfo>
): Connection<T> {
  return {
    pageInfo: createPageInfo({
      total: nodes.length,
      totalPages: 1,
      ...pageInfo,
    }),
    nodes,
  };
}

// ============================================
// API Response Factories
// ============================================

export function createGetTournamentResponse(tournament: Tournament | null) {
  return { tournament };
}

export function createGetEventSetsResponse(sets: Set[], pageInfo?: Partial<PageInfo>) {
  return {
    event: {
      sets: createConnection(sets, pageInfo),
    },
  };
}

export function createGetEventEntrantsResponse(entrants: Entrant[], pageInfo?: Partial<PageInfo>) {
  return {
    event: {
      entrants: createConnection(entrants, pageInfo),
    },
  };
}

export function createGetTournamentsByOwnerResponse(
  tournaments: Tournament[],
  pageInfo?: Partial<PageInfo>
) {
  return {
    currentUser: {
      tournaments: createConnection(tournaments, pageInfo),
    },
  };
}

export function createReportSetResponse(setId: string, state = SET_STATE.COMPLETED) {
  return {
    reportBracketSet: {
      id: setId,
      state,
    },
  };
}

// ============================================
// Error Responses
// ============================================

export const mockErrors = {
  notFound: {
    errors: [
      {
        message: 'Tournament not found',
        path: ['tournament'],
      },
    ],
    data: { tournament: null },
  },
  unauthorized: {
    errors: [
      {
        message: 'Invalid authentication credentials',
        path: ['currentUser'],
      },
    ],
    data: null,
  },
  rateLimited: {
    errors: [
      {
        message: 'Rate limit exceeded. Please try again later.',
        extensions: {
          code: 'RATE_LIMITED',
          retryAfter: 60,
        },
      },
    ],
    data: null,
  },
};
