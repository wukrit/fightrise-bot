// Start.gg API Response Types

// Common types
export interface PageInfo {
  total: number;
  totalPages: number;
  page?: number;
  perPage?: number;
}

export interface Connection<T> {
  pageInfo: PageInfo;
  nodes: T[];
}

// User types
export interface User {
  id: string;
  slug: string;
  name?: string;
}

// Participant types
export interface Participant {
  id?: string;
  user: User | null;
}

// Entrant types
export interface Entrant {
  id: string;
  name: string;
  participants: Participant[];
}

// Standing/Score types
export interface Score {
  value: number | null;
}

export interface StandingStats {
  score: Score;
}

export interface Standing {
  stats: StandingStats;
}

// Set slot types
export interface SetSlot {
  entrant: Entrant | null;
  standing: Standing | null;
}

// Set (Match) types
export interface Set {
  id: string;
  state: number;
  fullRoundText: string;
  identifier: string;
  round: number;
  slots: SetSlot[];
}

// Event types
export interface Event {
  id: string;
  name: string;
  numEntrants?: number;
  state?: string;
  sets?: Connection<Set>;
  entrants?: Connection<Entrant>;
}

// Tournament types
export interface Tournament {
  id: string;
  name: string;
  slug?: string;
  startAt: number | null;
  endAt: number | null;
  state: number | null;
  events: Event[];
}

// Query response types
export interface GetTournamentResponse {
  tournament: Tournament | null;
}

export interface GetEventSetsResponse {
  event: {
    sets: Connection<Set>;
  } | null;
}

export interface GetEventEntrantsResponse {
  event: {
    entrants: Connection<Entrant>;
  } | null;
}

export interface GetTournamentsByOwnerResponse {
  currentUser: {
    tournaments: Connection<Tournament>;
  } | null;
}

// Mutation response types
export interface ReportSetResponse {
  reportBracketSet: {
    id: string;
    state: number;
  } | null;
}

// Client configuration
export interface StartGGClientConfig {
  apiKey: string;
  cache?: CacheConfig;
  retry?: RetryConfig;
}

export interface CacheConfig {
  enabled: boolean;
  ttlMs?: number;
  maxEntries?: number;
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

// Error types
export class StartGGError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'StartGGError';
  }
}

export class RateLimitError extends StartGGError {
  constructor(
    message: string,
    public readonly retryAfterMs?: number
  ) {
    super(message, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class AuthError extends StartGGError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class GraphQLError extends StartGGError {
  constructor(
    message: string,
    public readonly errors: Array<{ message: string; path?: string[] }>
  ) {
    super(message, 'GRAPHQL_ERROR');
    this.name = 'GraphQLError';
  }
}
