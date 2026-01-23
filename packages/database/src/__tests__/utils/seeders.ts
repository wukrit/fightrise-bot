import { PrismaClient } from '@prisma/client';
import type {
  User,
  Tournament,
  Event,
  Match,
  MatchPlayer,
  Registration,
  TournamentAdmin,
  GuildConfig,
  TournamentState,
  MatchState,
  RegistrationSource,
  RegistrationStatus,
  AdminRole,
} from '@prisma/client';

// Counter for generating unique IDs
let idCounter = 0;
const uniqueId = () => `test-${++idCounter}-${Date.now()}`;

// ============================================
// User Factory
// ============================================

interface CreateUserOptions {
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  startggId?: string;
  startggSlug?: string;
  startggGamerTag?: string;
  email?: string;
  displayName?: string;
}

export async function createUser(
  prisma: PrismaClient,
  options: CreateUserOptions = {}
): Promise<User> {
  const id = uniqueId();
  return prisma.user.create({
    data: {
      discordId: options.discordId ?? `discord-${id}`,
      discordUsername: options.discordUsername ?? `testuser-${id}`,
      discordAvatar: options.discordAvatar,
      startggId: options.startggId,
      startggSlug: options.startggSlug,
      startggGamerTag: options.startggGamerTag,
      email: options.email,
      displayName: options.displayName ?? `Test User ${id}`,
    },
  });
}

export async function createLinkedUser(
  prisma: PrismaClient,
  options: CreateUserOptions = {}
): Promise<User> {
  const id = uniqueId();
  return createUser(prisma, {
    discordId: options.discordId ?? `discord-${id}`,
    startggId: options.startggId ?? `startgg-${id}`,
    startggSlug: options.startggSlug ?? `player-${id}`,
    startggGamerTag: options.startggGamerTag ?? `Player${id}`,
    ...options,
  });
}

// ============================================
// Tournament Factory
// ============================================

interface CreateTournamentOptions {
  startggId?: string;
  startggSlug?: string;
  name?: string;
  startAt?: Date;
  endAt?: Date;
  state?: TournamentState;
  discordGuildId?: string;
  discordChannelId?: string;
  autoCreateThreads?: boolean;
  requireCheckIn?: boolean;
  checkInWindowMinutes?: number;
  allowSelfReporting?: boolean;
}

export async function createTournament(
  prisma: PrismaClient,
  options: CreateTournamentOptions = {}
): Promise<Tournament> {
  const id = uniqueId();
  return prisma.tournament.create({
    data: {
      startggId: options.startggId ?? `startgg-tournament-${id}`,
      startggSlug: options.startggSlug ?? `tournament/test-${id}`,
      name: options.name ?? `Test Tournament ${id}`,
      startAt: options.startAt,
      endAt: options.endAt,
      state: options.state ?? 'CREATED',
      discordGuildId: options.discordGuildId ?? `guild-${id}`,
      discordChannelId: options.discordChannelId ?? `channel-${id}`,
      autoCreateThreads: options.autoCreateThreads ?? true,
      requireCheckIn: options.requireCheckIn ?? true,
      checkInWindowMinutes: options.checkInWindowMinutes ?? 10,
      allowSelfReporting: options.allowSelfReporting ?? true,
    },
  });
}

export async function createActiveTournament(
  prisma: PrismaClient,
  options: CreateTournamentOptions = {}
): Promise<Tournament> {
  return createTournament(prisma, {
    state: 'IN_PROGRESS',
    startAt: new Date(Date.now() - 3600000), // Started 1 hour ago
    ...options,
  });
}

// ============================================
// Event Factory
// ============================================

interface CreateEventOptions {
  tournamentId?: string;
  startggId?: string;
  name?: string;
  numEntrants?: number;
  state?: number;
}

export async function createEvent(
  prisma: PrismaClient,
  tournamentId: string,
  options: CreateEventOptions = {}
): Promise<Event> {
  const id = uniqueId();
  return prisma.event.create({
    data: {
      tournamentId,
      startggId: options.startggId ?? `startgg-event-${id}`,
      name: options.name ?? `Test Event ${id}`,
      numEntrants: options.numEntrants ?? 0,
      state: options.state ?? 1,
    },
  });
}

// ============================================
// Match Factory
// ============================================

interface CreateMatchOptions {
  startggSetId?: string;
  identifier?: string;
  roundText?: string;
  round?: number;
  state?: MatchState;
  discordThreadId?: string;
  checkInDeadline?: Date;
}

export async function createMatch(
  prisma: PrismaClient,
  eventId: string,
  options: CreateMatchOptions = {}
): Promise<Match> {
  const id = uniqueId();
  return prisma.match.create({
    data: {
      eventId,
      startggSetId: options.startggSetId ?? `startgg-set-${id}`,
      identifier: options.identifier ?? `A${idCounter}`,
      roundText: options.roundText ?? 'Winners Round 1',
      round: options.round ?? 1,
      state: options.state ?? 'NOT_STARTED',
      discordThreadId: options.discordThreadId,
      checkInDeadline: options.checkInDeadline,
    },
  });
}

export async function createActiveMatch(
  prisma: PrismaClient,
  eventId: string,
  options: CreateMatchOptions = {}
): Promise<Match> {
  return createMatch(prisma, eventId, {
    state: 'CALLED',
    checkInDeadline: new Date(Date.now() + 600000), // 10 minutes from now
    ...options,
  });
}

// ============================================
// Match Player Factory
// ============================================

interface CreateMatchPlayerOptions {
  startggEntrantId?: string;
  playerName?: string;
  isCheckedIn?: boolean;
  checkedInAt?: Date;
  reportedScore?: number;
  isWinner?: boolean;
  userId?: string;
}

export async function createMatchPlayer(
  prisma: PrismaClient,
  matchId: string,
  options: CreateMatchPlayerOptions = {}
): Promise<MatchPlayer> {
  const id = uniqueId();
  return prisma.matchPlayer.create({
    data: {
      matchId,
      startggEntrantId: options.startggEntrantId ?? `entrant-${id}`,
      playerName: options.playerName ?? `Player ${id}`,
      isCheckedIn: options.isCheckedIn ?? false,
      checkedInAt: options.checkedInAt,
      reportedScore: options.reportedScore,
      isWinner: options.isWinner,
      userId: options.userId,
    },
  });
}

export async function createCheckedInPlayer(
  prisma: PrismaClient,
  matchId: string,
  options: CreateMatchPlayerOptions = {}
): Promise<MatchPlayer> {
  return createMatchPlayer(prisma, matchId, {
    isCheckedIn: true,
    checkedInAt: new Date(),
    ...options,
  });
}

// ============================================
// Registration Factory
// ============================================

interface CreateRegistrationOptions {
  startggEntrantId?: string;
  source?: RegistrationSource;
  status?: RegistrationStatus;
  displayName?: string;
  eventId?: string;
}

export async function createRegistration(
  prisma: PrismaClient,
  userId: string,
  tournamentId: string,
  options: CreateRegistrationOptions = {}
): Promise<Registration> {
  const id = uniqueId();
  return prisma.registration.create({
    data: {
      userId,
      tournamentId,
      startggEntrantId: options.startggEntrantId ?? `entrant-${id}`,
      source: options.source ?? 'DISCORD',
      status: options.status ?? 'PENDING',
      displayName: options.displayName,
      eventId: options.eventId,
    },
  });
}

export async function createConfirmedRegistration(
  prisma: PrismaClient,
  userId: string,
  tournamentId: string,
  options: CreateRegistrationOptions = {}
): Promise<Registration> {
  return createRegistration(prisma, userId, tournamentId, {
    source: 'STARTGG',
    status: 'CONFIRMED',
    ...options,
  });
}

// ============================================
// Tournament Admin Factory
// ============================================

interface CreateTournamentAdminOptions {
  role?: AdminRole;
}

export async function createTournamentAdmin(
  prisma: PrismaClient,
  userId: string,
  tournamentId: string,
  options: CreateTournamentAdminOptions = {}
): Promise<TournamentAdmin> {
  return prisma.tournamentAdmin.create({
    data: {
      userId,
      tournamentId,
      role: options.role ?? 'MODERATOR',
    },
  });
}

// ============================================
// Guild Config Factory
// ============================================

interface CreateGuildConfigOptions {
  discordGuildId?: string;
  announcementChannelId?: string;
  matchChannelId?: string;
  prefix?: string;
  locale?: string;
  timezone?: string;
}

export async function createGuildConfig(
  prisma: PrismaClient,
  options: CreateGuildConfigOptions = {}
): Promise<GuildConfig> {
  const id = uniqueId();
  return prisma.guildConfig.create({
    data: {
      discordGuildId: options.discordGuildId ?? `guild-${id}`,
      announcementChannelId: options.announcementChannelId,
      matchChannelId: options.matchChannelId,
      prefix: options.prefix ?? '!',
      locale: options.locale ?? 'en',
      timezone: options.timezone ?? 'UTC',
    },
  });
}

// ============================================
// Complex Scenario Factories
// ============================================

/**
 * Creates a complete tournament setup with events, matches, and players.
 * Useful for integration tests that need a realistic data structure.
 */
export async function createFullTournamentSetup(
  prisma: PrismaClient,
  options: {
    playerCount?: number;
    matchCount?: number;
  } = {}
): Promise<{
  tournament: Tournament;
  event: Event;
  matches: Match[];
  players: User[];
  registrations: Registration[];
}> {
  const playerCount = options.playerCount ?? 4;
  const matchCount = options.matchCount ?? 3;

  // Create tournament and event
  const tournament = await createActiveTournament(prisma);
  const event = await createEvent(prisma, tournament.id, {
    numEntrants: playerCount,
  });

  // Create players with registrations
  const players: User[] = [];
  const registrations: Registration[] = [];

  for (let i = 0; i < playerCount; i++) {
    const player = await createLinkedUser(prisma);
    players.push(player);

    const registration = await createConfirmedRegistration(
      prisma,
      player.id,
      tournament.id,
      { eventId: event.id }
    );
    registrations.push(registration);
  }

  // Create matches with players
  const matches: Match[] = [];

  for (let i = 0; i < matchCount; i++) {
    const match = await createActiveMatch(prisma, event.id, {
      identifier: `A${i + 1}`,
      roundText: i === matchCount - 1 ? 'Grand Finals' : `Winners Round ${i + 1}`,
      round: i + 1,
    });

    // Assign two players to each match
    const player1Index = (i * 2) % playerCount;
    const player2Index = (i * 2 + 1) % playerCount;

    await createMatchPlayer(prisma, match.id, {
      playerName: players[player1Index].displayName ?? `Player ${player1Index + 1}`,
      userId: players[player1Index].id,
    });

    await createMatchPlayer(prisma, match.id, {
      playerName: players[player2Index].displayName ?? `Player ${player2Index + 1}`,
      userId: players[player2Index].id,
    });

    matches.push(match);
  }

  return { tournament, event, matches, players, registrations };
}

/**
 * Creates a match ready for score reporting.
 * Both players checked in, match in progress.
 */
export async function createMatchReadyForScoring(
  prisma: PrismaClient
): Promise<{
  match: Match;
  player1: MatchPlayer;
  player2: MatchPlayer;
  user1: User;
  user2: User;
}> {
  const tournament = await createActiveTournament(prisma);
  const event = await createEvent(prisma, tournament.id);

  const user1 = await createLinkedUser(prisma);
  const user2 = await createLinkedUser(prisma);

  const match = await createMatch(prisma, event.id, {
    state: 'IN_PROGRESS',
  });

  const player1 = await createCheckedInPlayer(prisma, match.id, {
    playerName: user1.displayName ?? 'Player 1',
    userId: user1.id,
  });

  const player2 = await createCheckedInPlayer(prisma, match.id, {
    playerName: user2.displayName ?? 'Player 2',
    userId: user2.id,
  });

  return { match, player1, player2, user1, user2 };
}

// Reset counter between test runs
export function resetIdCounter(): void {
  idCounter = 0;
}
