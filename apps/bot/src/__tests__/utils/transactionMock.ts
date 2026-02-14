import { vi, type Mock } from 'vitest';

export interface MockMatch {
  findUnique: Mock;
  findMany: Mock;
  update: Mock;
  updateMany: Mock;
  create: Mock;
  deleteMany: Mock;
}

export interface MockMatchPlayer {
  findUnique: Mock;
  findMany: Mock;
  update: Mock;
  updateMany: Mock;
  create: Mock;
  count: Mock;
}

export interface MockTournament {
  findUnique: Mock;
  findMany: Mock;
  upsert: Mock;
  update: Mock;
  create: Mock;
}

export interface MockEvent {
  findUnique: Mock;
  findMany: Mock;
  upsert: Mock;
  deleteMany: Mock;
  create: Mock;
}

export interface MockTournamentAdmin {
  upsert: Mock;
}

export interface MockGuildConfig {
  upsert: Mock;
}

export interface MockUser {
  findUnique: Mock;
  upsert: Mock;
  update: Mock;
}

export interface MockRegistration {
  findUnique: Mock;
  findMany: Mock;
  upsert: Mock;
  delete: Mock;
  create: Mock;
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
  prisma: { $transaction: Mock },
  overrides?: TransactionOverrides
): MockTransactionClient {
  const txClient = createMockTransaction(overrides);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
    return callback(txClient);
  });

  return txClient;
}
