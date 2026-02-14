import { vi, type MockFn } from 'vitest';

export interface MockMatch {
  findUnique: MockFn;
  findMany: MockFn;
  update: MockFn;
  updateMany: MockFn;
  create: MockFn;
  deleteMany: MockFn;
}

export interface MockMatchPlayer {
  findUnique: MockFn;
  findMany: MockFn;
  update: MockFn;
  updateMany: MockFn;
  create: MockFn;
  count: MockFn;
}

export interface MockTournament {
  findUnique: MockFn;
  findMany: MockFn;
  upsert: MockFn;
  update: MockFn;
  create: MockFn;
}

export interface MockEvent {
  findUnique: MockFn;
  findMany: MockFn;
  upsert: MockFn;
  deleteMany: MockFn;
  create: MockFn;
}

export interface MockTournamentAdmin {
  upsert: MockFn;
}

export interface MockGuildConfig {
  upsert: MockFn;
}

export interface MockUser {
  findUnique: MockFn;
  upsert: MockFn;
  update: MockFn;
}

export interface MockRegistration {
  findUnique: MockFn;
  findMany: MockFn;
  upsert: MockFn;
  delete: MockFn;
  create: MockFn;
}

export interface MockTransactionClient {
  match: MockMatch;
  matchPlayer: MockMatchPlayer;
  tournament: MockTournament;
  event: MockEvent;
  tournamentAdmin: MockTournamentAdmin;
  guildConfig: MockGuildConfig;
  user: MockUser;
  registration: MockRegistration;
}

export interface TransactionOverrides {
  match?: Partial<MockMatch>;
  matchPlayer?: Partial<MockMatchPlayer>;
  tournament?: Partial<MockTournament>;
  event?: Partial<MockEvent>;
  tournamentAdmin?: Partial<MockTournamentAdmin>;
  guildConfig?: Partial<MockGuildConfig>;
  user?: Partial<MockUser>;
  registration?: Partial<MockRegistration>;
}

/**
 * Creates a mock Prisma transaction client for testing services.
 * @param overrides - Optional overrides for specific model methods
 * @returns A mock transaction client with all Prisma model methods
 */
export function createMockTransaction(
  overrides?: TransactionOverrides
): MockTransactionClient {
  return {
    match: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn(),
      deleteMany: vi.fn(),
      ...overrides?.match,
    },
    matchPlayer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
      ...overrides?.matchPlayer,
    },
    tournament: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      ...overrides?.tournament,
    },
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn(),
      ...overrides?.event,
    },
    tournamentAdmin: {
      upsert: vi.fn(),
      ...overrides?.tournamentAdmin,
    },
    guildConfig: {
      upsert: vi.fn(),
      ...overrides?.guildConfig,
    },
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      ...overrides?.user,
    },
    registration: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      ...overrides?.registration,
    },
  };
}

/**
 * Sets up a mock for prisma.$transaction that executes the callback with a mock client.
 * @param prisma - The mocked prisma module
 * @param overrides - Optional overrides for the transaction client
 * @returns The mock transaction client for assertions
 */
export function setupTransactionMock(
  prisma: { $transaction: MockFn },
  overrides?: TransactionOverrides
): MockTransactionClient {
  const txClient = createMockTransaction(overrides);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
    return callback(txClient);
  });

  return txClient;
}
