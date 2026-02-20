import { GraphQLClient, ClientError } from 'graphql-request';
import { ResponseCache } from './cache.js';
import { withRetry } from './retry.js';
import {
  GET_TOURNAMENT,
  GET_EVENT_SETS,
  GET_EVENT_ENTRANTS,
  GET_TOURNAMENTS_BY_OWNER,
} from './queries/index.js';
import { REPORT_SET } from './mutations/index.js';
import {
  StartGGClientConfig,
  GetTournamentResponse,
  GetEventSetsResponse,
  GetEventEntrantsResponse,
  GetTournamentsByOwnerResponse,
  ReportSetResponse,
  Tournament,
  Set,
  SetState,
  Entrant,
  Connection,
  StartGGError,
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
  private timeoutMs: number;
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  constructor(config: StartGGClientConfig) {
    this.client = new GraphQLClient(STARTGG_API_URL, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    this.cache = new ResponseCache(config.cache ?? { enabled: false });
    this.retryConfig = config.retry;
    this.timeoutMs = config.timeout ?? 30000;
  }

  private getRequestKey(query: string, variables: Record<string, unknown>): string {
    return `${query}:${JSON.stringify(variables)}`;
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

    // Deduplicate concurrent requests for the same query/variables
    const requestKey = this.getRequestKey(query, variables);
    const existingRequest = this.pendingRequests.get(requestKey);
    if (existingRequest) {
      return existingRequest as Promise<T>;
    }

    // Make request with retry logic
    const requestPromise = withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          return await this.client.request<T>({
            document: query,
            variables,
            signal: controller.signal,
          });
        } catch (error) {
          this.handleError(error);
        } finally {
          clearTimeout(timeoutId);
        }
      },
      this.retryConfig
    ).finally(() => {
      // Remove from pending requests when complete
      this.pendingRequests.delete(requestKey);
    });

    this.pendingRequests.set(requestKey, requestPromise);

    const result = await requestPromise;

    // Cache the result
    if (options.cacheKey) {
      this.cache.set(options.cacheKey, variables, result);
    }

    return result;
  }

  private handleError(error: unknown): never {
    if (error instanceof ClientError) {
      // Check for timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        throw new StartGGError(
          'Request to Start.gg timed out. Please try again later.'
        );
      }

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
          `GraphQL errors: ${errors.map((e) => e.message).join(', ')}`,
          errors
        );
      }
    }

    // Check for network errors (including timeouts)
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new StartGGError(
          'Request to Start.gg timed out. Please try again later.'
        );
      }

      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        throw new StartGGError(
          'Request to Start.gg timed out. Please try again later.'
        );
      }
    }

    throw error;
  }

  async getTournament(slug: string): Promise<Tournament | null> {
    const result = await this.request<GetTournamentResponse>(
      GET_TOURNAMENT,
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
    const result = await this.request<GetEventSetsResponse>(
      GET_EVENT_SETS,
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
    const result = await this.request<GetEventEntrantsResponse>(
      GET_EVENT_ENTRANTS,
      { eventId, page, perPage },
      { cacheKey: 'getEventEntrants' }
    );

    return result.event?.entrants ?? null;
  }

  async getTournamentsByOwner(
    page = 1,
    perPage = 25
  ): Promise<Connection<Tournament> | null> {
    const result = await this.request<GetTournamentsByOwnerResponse>(
      GET_TOURNAMENTS_BY_OWNER,
      { page, perPage },
      { cacheKey: 'getTournamentsByOwner' }
    );

    return result.currentUser?.tournaments ?? null;
  }

  async reportSet(
    setId: string,
    winnerId: string
  ): Promise<{ id: string; state: SetState } | null> {
    const result = await this.request<ReportSetResponse>(
      REPORT_SET,
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
