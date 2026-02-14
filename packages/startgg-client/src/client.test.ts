import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartGGClient } from './index.js';

// Mock graphql-request
vi.mock('graphql-request', () => {
  const mockRequest = vi.fn();
  return {
    GraphQLClient: vi.fn().mockImplementation(() => ({
      request: mockRequest,
    })),
    ClientError: class ClientError extends Error {
      response: { status: number; errors?: Array<{ message: string }> };
      constructor(
        response: { status: number; errors?: Array<{ message: string }> },
        request: unknown
      ) {
        super('GraphQL Error');
        this.response = response;
      }
    },
  };
});

describe('StartGGClient', () => {
  let client: StartGGClient;
  let mockRequest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { GraphQLClient } = await import('graphql-request');
    client = new StartGGClient({ apiKey: 'test-api-key' });
    mockRequest = (GraphQLClient as unknown as ReturnType<typeof vi.fn>).mock
      .results[0].value.request;
  });

  describe('constructor', () => {
    it('should create client with API key', async () => {
      const { GraphQLClient } = await import('graphql-request');

      new StartGGClient({ apiKey: 'my-api-key' });

      expect(GraphQLClient).toHaveBeenCalledWith(
        'https://api.start.gg/gql/alpha',
        {
          headers: {
            Authorization: 'Bearer my-api-key',
          },
        }
      );
    });

    it('should accept cache configuration', () => {
      const clientWithCache = new StartGGClient({
        apiKey: 'test',
        cache: { enabled: true, ttlMs: 5000 },
      });

      expect(clientWithCache).toBeInstanceOf(StartGGClient);
    });

    it('should accept retry configuration', () => {
      const clientWithRetry = new StartGGClient({
        apiKey: 'test',
        retry: { maxRetries: 5, baseDelayMs: 2000 },
      });

      expect(clientWithRetry).toBeInstanceOf(StartGGClient);
    });
  });

  describe('getTournament', () => {
    it('should return tournament data', async () => {
      const mockTournament = {
        id: '123',
        name: 'Test Tournament',
        slug: 'test-tournament',
        startAt: 1234567890,
        endAt: 1234567899,
        state: 1,
        events: [{ id: '456', name: 'SF6', numEntrants: 32, state: 'ACTIVE' }],
      };

      mockRequest.mockResolvedValueOnce({ tournament: mockTournament });

      const result = await client.getTournament('test-tournament');

      expect(result).toEqual(mockTournament);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('GetTournament'),
        { slug: 'test-tournament' }
      );
    });

    it('should return null for non-existent tournament', async () => {
      mockRequest.mockResolvedValueOnce({ tournament: null });

      const result = await client.getTournament('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getEventSets', () => {
    it('should return paginated sets', async () => {
      const mockSets = {
        pageInfo: { total: 10, totalPages: 1 },
        nodes: [
          {
            id: '1',
            state: 2,
            fullRoundText: 'Winners Round 1',
            identifier: 'A',
            round: 1,
            slots: [],
          },
        ],
      };

      mockRequest.mockResolvedValueOnce({ event: { sets: mockSets } });

      const result = await client.getEventSets('456');

      expect(result).toEqual(mockSets);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('GetEventSets'),
        { eventId: '456', page: 1, perPage: 50 }
      );
    });

    it('should support custom pagination', async () => {
      mockRequest.mockResolvedValueOnce({
        event: { sets: { pageInfo: { total: 100, totalPages: 10 }, nodes: [] } },
      });

      await client.getEventSets('456', 2, 10);

      expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
        eventId: '456',
        page: 2,
        perPage: 10,
      });
    });

    it('should return null for non-existent event', async () => {
      mockRequest.mockResolvedValueOnce({ event: null });

      const result = await client.getEventSets('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getEventEntrants', () => {
    it('should return paginated entrants', async () => {
      const mockEntrants = {
        pageInfo: { total: 32, totalPages: 1 },
        nodes: [
          {
            id: '1',
            name: 'Player1',
            participants: [{ user: { id: 'u1', slug: 'player1', name: 'P1' } }],
          },
        ],
      };

      mockRequest.mockResolvedValueOnce({ event: { entrants: mockEntrants } });

      const result = await client.getEventEntrants('456');

      expect(result).toEqual(mockEntrants);
    });
  });

  describe('getTournamentsByOwner', () => {
    it('should return user tournaments', async () => {
      const mockTournaments = {
        pageInfo: { total: 5, totalPages: 1 },
        nodes: [
          {
            id: '1',
            name: 'My Tournament',
            slug: 'my-tournament',
            startAt: 1234567890,
            endAt: 1234567899,
            state: 1,
            events: [],
          },
        ],
      };

      mockRequest.mockResolvedValueOnce({
        currentUser: { tournaments: mockTournaments },
      });

      const result = await client.getTournamentsByOwner();

      expect(result).toEqual(mockTournaments);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('GetTournamentsByOwner'),
        { page: 1, perPage: 25 }
      );
    });

    it('should return null when user has no tournaments', async () => {
      mockRequest.mockResolvedValueOnce({ currentUser: null });

      const result = await client.getTournamentsByOwner();

      expect(result).toBeNull();
    });
  });

  describe('reportSet', () => {
    it('should report set result', async () => {
      const mockResult = { id: '123', state: 3 };

      mockRequest.mockResolvedValueOnce({ reportBracketSet: mockResult });

      const result = await client.reportSet('123', '456');

      expect(result).toEqual(mockResult);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('ReportSet'),
        { setId: '123', winnerId: '456' }
      );
    });
  });

  describe('caching', () => {
    it('should cache responses when enabled', async () => {
      const clientWithCache = new StartGGClient({
        apiKey: 'test',
        cache: { enabled: true },
      });

      const { GraphQLClient } = await import('graphql-request');
      const cachedMockRequest = (
        GraphQLClient as unknown as ReturnType<typeof vi.fn>
      ).mock.results[1].value.request;

      const mockTournament = { id: '1', name: 'Test', events: [] };
      cachedMockRequest.mockResolvedValue({ tournament: mockTournament });

      // First call
      await clientWithCache.getTournament('test');
      // Second call should use cache
      await clientWithCache.getTournament('test');

      expect(cachedMockRequest).toHaveBeenCalledTimes(1);
    });

    it('should not cache mutations', async () => {
      const clientWithCache = new StartGGClient({
        apiKey: 'test',
        cache: { enabled: true },
      });

      const { GraphQLClient } = await import('graphql-request');
      const cachedMockRequest = (
        GraphQLClient as unknown as ReturnType<typeof vi.fn>
      ).mock.results[1].value.request;

      cachedMockRequest.mockResolvedValue({ reportBracketSet: { id: '1', state: 3 } });

      await clientWithCache.reportSet('1', '2');
      await clientWithCache.reportSet('1', '2');

      expect(cachedMockRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      const clientWithCache = new StartGGClient({
        apiKey: 'test',
        cache: { enabled: true },
      });

      clientWithCache.clearCache();

      expect(clientWithCache.cacheSize).toBe(0);
    });

    it('should invalidate specific method cache', async () => {
      const clientWithCache = new StartGGClient({
        apiKey: 'test',
        cache: { enabled: true },
      });

      const { GraphQLClient } = await import('graphql-request');
      const cachedMockRequest = (
        GraphQLClient as unknown as ReturnType<typeof vi.fn>
      ).mock.results[1].value.request;

      cachedMockRequest.mockResolvedValue({ tournament: { id: '1' } });

      await clientWithCache.getTournament('test');
      clientWithCache.invalidateCache('getTournament');
      await clientWithCache.getTournament('test');

      expect(cachedMockRequest).toHaveBeenCalledTimes(2);
    });
  });
});
