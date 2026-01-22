import { GraphQLClient, ClientError } from 'graphql-request';
import { ResponseCache } from './cache.js';
import { withRetry } from './retry.js';
import {
  StartGGClientConfig,
  GetTournamentResponse,
  GetEventSetsResponse,
  GetEventEntrantsResponse,
  GetTournamentsByOwnerResponse,
  ReportSetResponse,
  Tournament,
  Set,
  Entrant,
  Connection,
  AuthError,
  GraphQLError as StartGGGraphQLError,
} from './types.js';

export * from './types.js';
export { ResponseCache } from './cache.js';
export { withRetry, createRetryWrapper } from './retry.js';

const STARTGG_API_URL = 'https://api.start.gg/gql/alpha';

export class StartGGClient {
  private client: GraphQLClient;
  private cache: ResponseCache;
  private retryConfig: StartGGClientConfig['retry'];

  constructor(config: StartGGClientConfig) {
    this.client = new GraphQLClient(STARTGG_API_URL, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    this.cache = new ResponseCache(config.cache ?? { enabled: false });
    this.retryConfig = config.retry;
  }

  private async request<T>(
    query: string,
    variables: Record<string, unknown>,
    options: { cacheKey?: string; skipCache?: boolean } = {}
  ): Promise<T> {
    // Check cache first
    if (options.cacheKey && !options.skipCache) {
      const cached = this.cache.get<T>(options.cacheKey, variables);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Make request with retry logic
    const result = await withRetry(
      async () => {
        try {
          return await this.client.request<T>(query, variables);
        } catch (error) {
          this.handleError(error);
          throw error; // Re-throw after handling
        }
      },
      this.retryConfig
    );

    // Cache the result
    if (options.cacheKey) {
      this.cache.set(options.cacheKey, variables, result);
    }

    return result;
  }

  private handleError(error: unknown): never {
    if (error instanceof ClientError) {
      // Check for auth errors
      if (error.response.status === 401 || error.response.status === 403) {
        throw new AuthError(
          error.message || 'Authentication failed. Check your API key.'
        );
      }

      // Check for GraphQL errors
      if (error.response.errors && error.response.errors.length > 0) {
        const errors = error.response.errors.map((e) => ({
          message: e.message,
          path: e.path?.map(String),
        }));
        throw new StartGGGraphQLError(
          `GraphQL error: ${errors[0].message}`,
          errors
        );
      }
    }

    throw error;
  }

  async getTournament(slug: string): Promise<Tournament | null> {
    const query = `
      query GetTournament($slug: String!) {
        tournament(slug: $slug) {
          id
          name
          slug
          startAt
          endAt
          state
          events {
            id
            name
            numEntrants
            state
          }
        }
      }
    `;

    const result = await this.request<GetTournamentResponse>(
      query,
      { slug },
      { cacheKey: 'getTournament' }
    );

    return result.tournament;
  }

  async getEventSets(
    eventId: string,
    page = 1,
    perPage = 50
  ): Promise<Connection<Set> | null> {
    const query = `
      query GetEventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
        event(id: $eventId) {
          sets(page: $page, perPage: $perPage, sortType: STANDARD) {
            pageInfo {
              total
              totalPages
            }
            nodes {
              id
              state
              fullRoundText
              identifier
              round
              slots {
                entrant {
                  id
                  name
                  participants {
                    user {
                      id
                      slug
                    }
                  }
                }
                standing {
                  stats {
                    score {
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.request<GetEventSetsResponse>(
      query,
      { eventId, page, perPage },
      { cacheKey: 'getEventSets' }
    );

    return result.event?.sets ?? null;
  }

  async getEventEntrants(
    eventId: string,
    page = 1,
    perPage = 50
  ): Promise<Connection<Entrant> | null> {
    const query = `
      query GetEventEntrants($eventId: ID!, $page: Int!, $perPage: Int!) {
        event(id: $eventId) {
          entrants(query: { page: $page, perPage: $perPage }) {
            pageInfo {
              total
              totalPages
            }
            nodes {
              id
              name
              participants {
                user {
                  id
                  slug
                  gamerTag
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.request<GetEventEntrantsResponse>(
      query,
      { eventId, page, perPage },
      { cacheKey: 'getEventEntrants' }
    );

    return result.event?.entrants ?? null;
  }

  async getTournamentsByOwner(
    page = 1,
    perPage = 25
  ): Promise<Connection<Tournament> | null> {
    const query = `
      query GetTournamentsByOwner($page: Int!, $perPage: Int!) {
        currentUser {
          tournaments(query: { page: $page, perPage: $perPage }) {
            pageInfo {
              total
              totalPages
            }
            nodes {
              id
              name
              slug
              startAt
              endAt
              state
              events {
                id
                name
                numEntrants
                state
              }
            }
          }
        }
      }
    `;

    const result = await this.request<GetTournamentsByOwnerResponse>(
      query,
      { page, perPage },
      { cacheKey: 'getTournamentsByOwner' }
    );

    return result.currentUser?.tournaments ?? null;
  }

  async reportSet(
    setId: string,
    winnerId: string
  ): Promise<{ id: string; state: number } | null> {
    const mutation = `
      mutation ReportSet($setId: ID!, $winnerId: ID!) {
        reportBracketSet(setId: $setId, winnerId: $winnerId) {
          id
          state
        }
      }
    `;

    const result = await this.request<ReportSetResponse>(
      mutation,
      { setId, winnerId },
      { skipCache: true } // Mutations should never be cached
    );

    // Invalidate related caches after mutation
    this.cache.invalidate('getEventSets');

    return result.reportBracketSet;
  }

  // Cache management methods
  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(method?: string): void {
    this.cache.invalidate(method);
  }

  get cacheSize(): number {
    return this.cache.size;
  }
}

export default StartGGClient;
