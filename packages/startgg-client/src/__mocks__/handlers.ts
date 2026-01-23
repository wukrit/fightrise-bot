/**
 * MSW handlers for mocking Start.gg GraphQL API.
 * Use these handlers in tests to simulate Start.gg API responses.
 */

import { graphql, HttpResponse } from 'msw';
import {
  mockTournaments,
  mockSets,
  mockEntrants,
  createGetTournamentResponse,
  createGetEventSetsResponse,
  createGetEventEntrantsResponse,
  createGetTournamentsByOwnerResponse,
  createReportSetResponse,
  mockErrors,
  SET_STATE,
} from './fixtures.js';

// Start.gg API URL
const STARTGG_API = 'https://api.start.gg/gql/alpha';

// Create a graphql namespace for Start.gg API
const startgg = graphql.link(STARTGG_API);

/**
 * Helper to wrap data in GraphQL response format
 */
function wrapInData<T>(data: T): { data: T } {
  return { data };
}

/**
 * Default handlers that return successful responses.
 * These can be overridden in individual tests using server.use().
 */
export const handlers = [
  // GetTournament query
  startgg.query('GetTournament', ({ variables }) => {
    const { slug } = variables as { slug: string };

    // Find tournament by slug
    const tournament = Object.values(mockTournaments).find(
      (t) => t.slug === slug
    );

    if (!tournament) {
      return HttpResponse.json(wrapInData(createGetTournamentResponse(null)));
    }

    return HttpResponse.json(wrapInData(createGetTournamentResponse(tournament)));
  }),

  // GetEventSets query
  startgg.query('GetEventSets', ({ variables }) => {
    const { eventId, page, perPage } = variables as {
      eventId: string;
      page: number;
      perPage: number;
    };

    // Return mock sets for event-1, empty for others
    const sets = eventId === 'event-1'
      ? Object.values(mockSets)
      : [];

    // Simple pagination
    const startIndex = (page - 1) * perPage;
    const paginatedSets = sets.slice(startIndex, startIndex + perPage);

    return HttpResponse.json(
      wrapInData(createGetEventSetsResponse(paginatedSets, {
        total: sets.length,
        totalPages: Math.ceil(sets.length / perPage),
        page,
        perPage,
      }))
    );
  }),

  // GetEventEntrants query
  startgg.query('GetEventEntrants', ({ variables }) => {
    const { eventId, page, perPage } = variables as {
      eventId: string;
      page: number;
      perPage: number;
    };

    // Return mock entrants for event-1, empty for others
    const entrants = eventId === 'event-1'
      ? Object.values(mockEntrants)
      : [];

    // Simple pagination
    const startIndex = (page - 1) * perPage;
    const paginatedEntrants = entrants.slice(startIndex, startIndex + perPage);

    return HttpResponse.json(
      wrapInData(createGetEventEntrantsResponse(paginatedEntrants, {
        total: entrants.length,
        totalPages: Math.ceil(entrants.length / perPage),
        page,
        perPage,
      }))
    );
  }),

  // GetTournamentsByOwner query
  startgg.query('GetTournamentsByOwner', ({ variables }) => {
    const { page, perPage } = variables as { page: number; perPage: number };

    const tournaments = Object.values(mockTournaments);
    const startIndex = (page - 1) * perPage;
    const paginatedTournaments = tournaments.slice(startIndex, startIndex + perPage);

    return HttpResponse.json(
      wrapInData(createGetTournamentsByOwnerResponse(paginatedTournaments, {
        total: tournaments.length,
        totalPages: Math.ceil(tournaments.length / perPage),
        page,
        perPage,
      }))
    );
  }),

  // ReportSet mutation
  startgg.mutation('ReportSet', ({ variables }) => {
    const { setId, winnerId: _winnerId } = variables as {
      setId: string;
      winnerId: string;
    };

    // Check if set exists
    const set = Object.values(mockSets).find((s) => s.id === setId);

    if (!set) {
      return HttpResponse.json({
        errors: [
          {
            message: `Set with id "${setId}" not found`,
            path: ['reportBracketSet'],
          },
        ],
        data: { reportBracketSet: null },
      });
    }

    return HttpResponse.json(
      wrapInData(createReportSetResponse(setId, SET_STATE.COMPLETED))
    );
  }),
];

/**
 * Error handlers for testing error scenarios.
 * Use these with server.use() in specific tests.
 */
export const errorHandlers = {
  // Return unauthorized error
  unauthorized: startgg.query('GetTournament', () => {
    return HttpResponse.json(mockErrors.unauthorized, { status: 401 });
  }),

  // Return rate limit error
  rateLimited: startgg.query('GetTournament', () => {
    return HttpResponse.json(mockErrors.rateLimited, { status: 429 });
  }),

  // Return not found
  notFound: startgg.query('GetTournament', () => {
    return HttpResponse.json(mockErrors.notFound);
  }),

  // Network error
  networkError: startgg.query('GetTournament', () => {
    return HttpResponse.error();
  }),

  // Slow response (for timeout testing)
  slowResponse: startgg.query('GetTournament', async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return HttpResponse.json(wrapInData(createGetTournamentResponse(mockTournaments.weeklyLocal)));
  }),
};

/**
 * Create custom handlers for specific test scenarios.
 */
export function createTournamentHandler(slug: string, response: Record<string, unknown>) {
  return startgg.query('GetTournament', ({ variables }) => {
    if ((variables as { slug: string }).slug === slug) {
      return HttpResponse.json(wrapInData(response));
    }
    return HttpResponse.json(wrapInData(createGetTournamentResponse(null)));
  });
}

export function createEventSetsHandler(eventId: string, response: Record<string, unknown>) {
  return startgg.query('GetEventSets', ({ variables }) => {
    if ((variables as { eventId: string }).eventId === eventId) {
      return HttpResponse.json(wrapInData(response));
    }
    return HttpResponse.json(wrapInData({
      event: null,
    }));
  });
}

export function createReportSetHandler(
  setId: string,
  response: Record<string, unknown>,
  options: { delay?: number; status?: number } = {}
) {
  return startgg.mutation('ReportSet', async ({ variables }) => {
    if (options.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }

    if ((variables as { setId: string }).setId === setId) {
      return HttpResponse.json(wrapInData(response), { status: options.status });
    }
    return HttpResponse.json({
      errors: [{ message: 'Set not found', path: ['reportBracketSet'] }],
      data: { reportBracketSet: null },
    });
  });
}
