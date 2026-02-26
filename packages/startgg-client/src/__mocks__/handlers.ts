// Auto-generated MSW handlers
// Generated: 2026-02-14T13:50:02.696Z
// Enhanced: 2026-02-26 - Added query/mutation handlers and error handlers

import { graphql, HttpResponse } from 'msw';

const STARTGG_API = 'https://api.start.gg/gql/alpha';
const startgg = graphql.link(STARTGG_API);

// Import fixtures for consistent test data
import {
  mockTournaments,
  mockEvents,
  mockSets,
  mockEntrants,
  SetState,
} from './fixtures.js';

// Success handlers for all queries
export const handlers = [
  // GetTournament query
  startgg.query('GetTournament', ({ variables }) => {
    const slug = variables.slug as string;

    // Handle specific tournament slugs for testing
    if (slug === 'tournament/not-found') {
      return HttpResponse.json({
        data: { tournament: null },
        errors: [{ message: 'Tournament not found', path: ['tournament'] }],
      });
    }

    if (slug === 'tournament/unauthorized') {
      return HttpResponse.json({
        data: null,
        errors: [{ message: 'Invalid authentication credentials', path: ['currentUser'] }],
      }, { status: 401 });
    }

    if (slug === 'tournament/rate-limited') {
      return HttpResponse.json({
        data: null,
        errors: [
          {
            message: 'Rate limit exceeded. Please try again later.',
            extensions: { code: 'RATE_LIMITED', retryAfter: 60 },
          },
        ],
      }, { status: 429 });
    }

    // Return mock tournament for valid slugs
    return HttpResponse.json({
      data: {
        tournament: {
          ...mockTournaments.weeklyLocal,
          slug,
        },
      },
    });
  }),

  // GetEventSets query
  startgg.query('GetEventSets', ({ variables }) => {
    const eventId = variables.eventId as string;

    if (eventId === 'event-empty') {
      return HttpResponse.json({
        data: {
          event: {
            sets: {
              pageInfo: { total: 0, totalPages: 1, page: 1, perPage: 50 },
              nodes: [],
            },
          },
        },
      });
    }

    if (eventId === 'event-not-found') {
      return HttpResponse.json({
        data: { event: null },
        errors: [{ message: 'Event not found', path: ['event'] }],
      });
    }

    return HttpResponse.json({
      data: {
        event: {
          sets: {
            pageInfo: { total: 4, totalPages: 1, page: 1, perPage: 50 },
            nodes: [mockSets.pendingSet, mockSets.activeSet, mockSets.completedSet, mockSets.grandFinals],
          },
        },
      },
    });
  }),

  // GetEventEntrants query
  startgg.query('GetEventEntrants', ({ variables }) => {
    const eventId = variables.eventId as string;
    const page = (variables.page as number) || 1;

    if (eventId === 'event-not-found') {
      return HttpResponse.json({
        data: { event: null },
        errors: [{ message: 'Event not found', path: ['event'] }],
      });
    }

    // Return paginated entrants
    const allEntrants = [mockEntrants.entrant1, mockEntrants.entrant2, mockEntrants.entrant3, mockEntrants.entrant4];
    const perPage = (variables.perPage as number) || 50;
    const startIndex = (page - 1) * perPage;
    const paginatedEntrants = allEntrants.slice(startIndex, startIndex + perPage);

    return HttpResponse.json({
      data: {
        event: {
          entrants: {
            pageInfo: {
              total: allEntrants.length,
              totalPages: Math.ceil(allEntrants.length / perPage),
              page,
              perPage,
            },
            nodes: paginatedEntrants,
          },
        },
      },
    });
  }),

  // GetTournamentsByOwner query
  startgg.query('GetTournamentsByOwner', () => {
    return HttpResponse.json({
      data: {
        currentUser: {
          tournaments: {
            pageInfo: { total: 2, totalPages: 1, page: 1, perPage: 25 },
            nodes: [mockTournaments.weeklyLocal, mockTournaments.majorTournament],
          },
        },
      },
    });
  }),

  // ReportSet mutation
  startgg.mutation('ReportSet', ({ variables }) => {
    const { setId, winnerId } = variables;

    if (setId === 'set-not-found') {
      return HttpResponse.json({
        data: { reportBracketSet: null },
        errors: [{ message: 'Set not found', path: ['reportBracketSet'] }],
      });
    }

    if (setId === 'set-unauthorized') {
      return HttpResponse.json({
        data: null,
        errors: [{ message: 'Unauthorized to report this set', path: ['reportBracketSet'] }],
      }, { status: 403 });
    }

    if (setId === 'set-rate-limited') {
      return HttpResponse.json({
        data: null,
        errors: [
          {
            message: 'Rate limit exceeded',
            extensions: { code: 'RATE_LIMITED', retryAfter: 60 },
          },
        ],
      }, { status: 429 });
    }

    return HttpResponse.json({
      data: {
        reportBracketSet: {
          id: setId,
          state: SetState.COMPLETED,
          winnerId,
        },
      },
    });
  }),

  // DqEntrant mutation (uses same ReportSet endpoint in Start.gg)
  startgg.mutation('DqEntrant', ({ variables }) => {
    const { setId } = variables;

    if (setId === 'set-not-found') {
      return HttpResponse.json({
        data: { reportBracketSet: null },
        errors: [{ message: 'Set not found', path: ['reportBracketSet'] }],
      });
    }

    // DQ is represented as COMPLETED state with special handling
    return HttpResponse.json({
      data: {
        reportBracketSet: {
          id: setId,
          state: SetState.COMPLETED,
        },
      },
    });
  }),

  // Legacy GetEvent query (used by some parts of codebase)
  startgg.query('GetEvent', () => {
    return HttpResponse.json({
      data: {
        tournament: mockTournaments.weeklyLocal,
        event: mockEvents.streetFighter,
      },
    });
  }),
];

// Error handlers for specific error scenarios - use with server.use()
export const errorHandlers = {
  notFound: graphql.query('GetTournament', () => {
    return HttpResponse.json({
      data: { tournament: null },
      errors: [{ message: 'Tournament not found', path: ['tournament'] }],
    });
  }),

  unauthorized: graphql.query('GetTournament', () => {
    return HttpResponse.json({
      data: null,
      errors: [{ message: 'Invalid authentication credentials', path: ['currentUser'] }],
    }, { status: 401 });
  }),

  rateLimited: graphql.query('GetTournament', () => {
    return HttpResponse.json({
      data: null,
      errors: [
        {
          message: 'Rate limit exceeded. Please try again later.',
          extensions: { code: 'RATE_LIMITED', retryAfter: 60 },
        },
      ],
    }, { status: 429 });
  }),

  setNotFound: graphql.mutation('ReportSet', () => {
    return HttpResponse.json({
      data: { reportBracketSet: null },
      errors: [{ message: 'Set not found', path: ['reportBracketSet'] }],
    });
  }),

  setUnauthorized: graphql.mutation('ReportSet', () => {
    return HttpResponse.json({
      data: null,
      errors: [{ message: 'Unauthorized to report this set', path: ['reportBracketSet'] }],
    }, { status: 403 });
  }),

  setRateLimited: graphql.mutation('ReportSet', () => {
    return HttpResponse.json({
      data: null,
      errors: [
        {
          message: 'Rate limit exceeded',
          extensions: { code: 'RATE_LIMITED', retryAfter: 60 },
        },
      ],
    }, { status: 429 });
  }),
};
