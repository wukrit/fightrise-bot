/**
 * Mock Start.gg GraphQL server for load testing.
 * Supports configurable latency and rate limit injection.
 */

import { http, HttpResponse, delay } from 'msw';
import { setupServer, type SetupServer } from 'msw/node';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

export interface MockServerConfig {
  latencyMs: number;
  rateLimitInjection?: number; // % of requests to return 429
  tournamentCount?: number;
  eventCount?: number;
  matchCount?: number;
}

interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
}

// Generate mock tournament data
function generateTournament(id: string, name: string) {
  return {
    id,
    name,
    slug: `tournament/${id}`,
    state: 'ACTIVE',
    startAt: Math.floor(Date.now() / 1000),
    events: [],
  };
}

// Generate mock event data
function generateEvent(id: string, tournamentId: string, name: string) {
  return {
    id,
    tournamentId,
    name,
    slug: `event/${id}`,
    state: 'ACTIVE',
    numEntrants: 8,
    phases: [],
  };
}

// Generate mock sets for an event
function generateSets(eventId: string, count: number) {
  const sets = [];
  for (let i = 0; i < count; i++) {
    const setId = `set-${eventId}-${i}`;
    sets.push({
      id: setId,
      eventId,
      round: Math.ceil((i + 1) / 4),
      state: 3, // COMPLETE
      startedAt: Math.floor(Date.now() / 1000) - 3600,
      completedAt: Math.floor(Date.now() / 1000) - 1800,
      slots: [
        {
          id: `slot-${setId}-1`,
          entrant: {
            id: `entrant-${eventId}-${(i % count) + 1}`,
            name: `Player ${(i % count) + 1}`,
          },
          score: i < count / 2 ? 2 : 0,
          standing: {
            placement: i < count / 2 ? 1 : 2,
            isFinal: true,
          },
        },
        {
          id: `slot-${setId}-2`,
          entrant: {
            id: `entrant-${eventId}-${((i + 1) % count) + 1}`,
            name: `Player ${((i + 1) % count) + 1}`,
          },
          score: i >= count / 2 ? 2 : 0,
          standing: {
            placement: i >= count / 2 ? 1 : 2,
            isFinal: true,
          },
        },
      ],
    });
  }
  return sets;
}

// Generate mock entrants
function generateEntrants(eventId: string, count: number) {
  const entrants = [];
  for (let i = 0; i < count; i++) {
    entrants.push({
      id: `entrant-${eventId}-${i + 1}`,
      name: `Player ${i + 1}`,
      participants: [
        {
          id: `user-${eventId}-${i + 1}`,
          slug: `user/player${i + 1}`,
          name: `Player ${i + 1}`,
        },
      ],
    });
  }
  return entrants;
}

export function createMockStartggServer(config: MockServerConfig): { server: SetupServer; config: MockServerConfig } {
  const { latencyMs = 100, rateLimitInjection = 0, tournamentCount = 10, eventCount = 5, matchCount = 10 } = config;

  // Track request counts for realistic responses
  let requestCount = 0;

  const handlers = [
    // Main GraphQL endpoint
    http.post(STARTGG_API, async ({ request }) => {
      requestCount++;

      // Simulate latency
      await delay(latencyMs);

      // Simulate rate limiting
      if (rateLimitInjection > 0 && Math.random() * 100 < rateLimitInjection) {
        return HttpResponse.json(
          {
            data: null,
            errors: [
              {
                message: 'Rate limit exceeded',
                locations: [],
                path: [],
                extensions: {
                  code: 'RATE_LIMITED',
                  exception: {
                    status: 429,
                  },
                },
              },
            ],
          },
          { status: 200 }
        );
      }

      try {
        const body = (await request.json()) as GraphQLRequest;
        const query = body.query || '.js';
        const variables = body.variables || {};

        // Parse query to determine response
        if (query.includes('query GetTournament') || query.includes('tournament')) {
          const tournamentId = (variables.id as string) || 'tournament-1.js';
          const events = [];

          // Generate events for the tournament
          for (let i = 0; i < eventCount; i++) {
            const eventId = `event-${tournamentId}-${i}`;
            events.push(generateEvent(eventId, tournamentId, `Event ${i + 1}`));
          }

          return HttpResponse.json({
            data: {
              tournament: generateTournament(tournamentId, `Tournament ${tournamentId}`),
            },
          });
        }

        if (query.includes('event') || query.includes('sets')) {
          const eventId = (variables.eventId as string) || (variables.id as string) || 'event-1.js';
          const sets = generateSets(eventId, matchCount);

          return HttpResponse.json({
            data: {
              event: {
                id: eventId,
                name: `Event ${eventId}`,
                sets: {
                  nodes: sets,
                  pageInfo: {
                    total: sets.length,
                    totalPages: 1,
                    page: 1,
                    perPage: 50,
                  },
                },
              },
            },
          });
        }

        if (query.includes('entrants') || query.includes('participants')) {
          const eventId = (variables.eventId as string) || (variables.id as string) || 'event-1.js';
          const entrants = generateEntrants(eventId, 8);

          return HttpResponse.json({
            data: {
              event: {
                id: eventId,
                entrants: {
                  nodes: entrants,
                  pageInfo: {
                    total: entrants.length,
                    totalPages: 1,
                    page: 1,
                    perPage: 50,
                  },
                },
              },
            },
          });
        }

        // Default response
        return HttpResponse.json({
          data: {},
        });
      } catch (error) {
        return HttpResponse.json(
          {
            data: null,
            errors: [
              {
                message: 'Invalid request',
                extensions: { code: 'BAD_REQUEST' },
              },
            ],
          },
          { status: 400 }
        );
      }
    }),
  ];

  const server = setupServer(...handlers);

  return {
    server,
    config: {
      latencyMs,
      rateLimitInjection,
      tournamentCount,
      eventCount,
      matchCount,
    },
  };
}

// Utility function to create a simple mock with default config
export function createDefaultMockServer(): { server: SetupServer; config: MockServerConfig } {
  return createMockStartggServer({
    latencyMs: 100,
    rateLimitInjection: 0,
    tournamentCount: 10,
    eventCount: 5,
    matchCount: 10,
  });
}
