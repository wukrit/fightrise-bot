/**
 * Mock data factory functions for E2E tests.
 * Creates realistic test data objects.
 */

// Use crypto.randomUUID for unique IDs (built into Node.js)
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Tournament data structure.
 */
export interface MockTournament {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  game: string;
  numEntrants: number;
  venue: string;
  address: string;
  isOnline: boolean;
  registrationOpen: boolean;
  discordGuildId: string | null;
  discordChannelId: string | null;
}

/**
 * User data structure.
 */
export interface MockUser {
  id: string;
  discordId: string;
  discordUsername: string;
  discordAvatar: string | null;
  startggId: string | null;
  startggUsername: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Match data structure.
 */
export interface MockMatch {
  id: string;
  startggSetId: string;
  tournamentId: string;
  eventId: string;
  round: number;
  phase: string;
  state: 'pending' | 'called' | 'checked_in' | 'in_progress' | 'completed' | 'disputed';
  scheduledTime: string | null;
  discordThreadId: string | null;
  players: MockMatchPlayer[];
  winnerId: string | null;
  score: string | null;
  bestOf: number;
}

/**
 * Match player data structure.
 */
export interface MockMatchPlayer {
  id: string;
  matchId: string;
  userId: string;
  seed: number | null;
  isCheckedIn: boolean;
  reportedScore: number | null;
  isWinner: boolean | null;
 DQ: boolean;
}

/**
 * Event data structure.
 */
export interface MockEvent {
  id: string;
  tournamentId: string;
  startggEventId: string;
  name: string;
  slug: string;
  game: string;
  numEntrants: number;
  phase: string;
  state: 'upcoming' | 'active' | 'completed';
  startDate: string;
  endDate: string;
}

/**
 * Registration data structure.
 */
export interface MockRegistration {
  id: string;
  userId: string;
  tournamentId: string;
  eventId: string | null;
  source: 'startgg' | 'discord' | 'manual';
  status: 'pending' | 'confirmed' | 'cancelled' | 'dq';
  confirmedAt: string | null;
  createdAt: string;
}

/**
 * Create a mock tournament.
 */
export function createTournament(overrides?: Partial<MockTournament>): MockTournament {
  const id = generateId();
  const now = new Date();
  const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  return {
    id,
    name: `Test Tournament ${id.slice(0, 8)}`,
    slug: `test-tournament-${id.slice(0, 8)}`,
    startDate: startDate.toISOString(),
    endDate: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
    game: 'Street Fighter 6',
    numEntrants: 0,
    venue: 'Test Venue',
    address: '123 Test Street, Test City, TC 12345',
    isOnline: false,
    registrationOpen: true,
    discordGuildId: null,
    discordChannelId: null,
    ...overrides,
  };
}

/**
 * Create a mock user.
 */
export function createUser(overrides?: Partial<MockUser>): MockUser {
  const id = generateId();

  return {
    id,
    discordId: `${Math.floor(Math.random() * 100000000000000000)}`,
    discordUsername: `TestUser${id.slice(0, 6)}`,
    discordAvatar: null,
    startggId: null,
    startggUsername: null,
    email: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock match.
 */
export function createMatch(
  tournament: MockTournament,
  event: MockEvent,
  players: MockUser[],
  overrides?: Partial<MockMatch>
): MockMatch {
  const id = generateId();
  const now = new Date();

  return {
    id,
    startggSetId: `set-${id.slice(0, 8)}`,
    tournamentId: tournament.id,
    eventId: event.id,
    round: 1,
    phase: 'Winners',
    state: 'pending',
    scheduledTime: now.toISOString(),
    discordThreadId: null,
    players: players.map((user, index) =>
      createMatchPlayer(id, user, { seed: index + 1 })
    ),
    winnerId: null,
    score: null,
    bestOf: 3,
    ...overrides,
  };
}

/**
 * Create a mock match player.
 */
export function createMatchPlayer(
  matchId: string,
  user: MockUser,
  overrides?: Partial<MockMatchPlayer>
): MockMatchPlayer {
  const id = generateId();

  return {
    id,
    matchId,
    userId: user.id,
    seed: null,
    isCheckedIn: false,
    reportedScore: null,
    isWinner: null,
    DQ: false,
    ...overrides,
  };
}

/**
 * Create a mock event.
 */
export function createEvent(tournament: MockTournament, overrides?: Partial<MockEvent>): MockEvent {
  const id = generateId();
  const startDate = new Date(tournament.startDate);

  return {
    id,
    tournamentId: tournament.id,
    startggEventId: `event-${id.slice(0, 8)}`,
    name: `${tournament.game} - Main`,
    slug: `${tournament.slug}-main`,
    game: tournament.game,
    numEntrants: 0,
    phase: 'Winners',
    state: 'upcoming',
    startDate: startDate.toISOString(),
    endDate: new Date(startDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock registration.
 */
export function createRegistration(
  user: MockUser,
  tournament: MockEvent,
  overrides?: Partial<MockRegistration>
): MockRegistration {
  const id = generateId();

  return {
    id,
    userId: user.id,
    tournamentId: tournament.tournamentId,
    eventId: tournament.id,
    source: 'discord',
    status: 'pending',
    confirmedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a complete tournament setup with event and registrations.
 */
export function createTournamentSetup(
  options?: {
    userCount?: number;
    game?: string;
    status?: MockTournament['status'];
  }
) {
  const { userCount = 4, game = 'Street Fighter 6', status = 'upcoming' } = options || {};

  const tournament = createTournament({ game, status });
  const event = createEvent(tournament);
  const users = Array.from({ length: userCount }, () => createUser());
  const matches: MockMatch[] = [];

  // Create matches for the event
  if (users.length >= 2) {
    // Create pairs of users for matches
    for (let i = 0; i < users.length; i += 2) {
      if (i + 1 < users.length) {
        const match = createMatch(tournament, event, [users[i], users[i + 1]], {
          round: Math.floor(i / 2) + 1,
        });
        matches.push(match);
      }
    }
  }

  const registrations = users.map((user) =>
    createRegistration(user, event, { status: 'confirmed', confirmedAt: new Date().toISOString() })
  );

  return {
    tournament,
    event,
    users,
    matches,
    registrations,
  };
}
