# Tasks for add-startgg-client-features

## 1. Type Definitions

- [x] 1.1 Create `packages/startgg-client/src/types.ts` with response types
- [x] 1.2 Add types for Tournament, Event, Set, Entrant, Participant
- [x] 1.3 Add types for pagination (PageInfo, Connection patterns)
- [x] 1.4 Update client methods to return strongly-typed responses

## 2. Additional Queries

- [x] 2.1 Implement `getTournamentsByOwner(userId)` query
- [x] 2.2 Add types for tournaments by owner response

## 3. Rate Limiting and Retry Logic

- [x] 3.1 Create `packages/startgg-client/src/retry.ts` with retry logic
- [x] 3.2 Implement exponential backoff with configurable max retries
- [x] 3.3 Handle rate limit errors (429) with appropriate delays
- [x] 3.4 Integrate retry logic into client

## 4. Response Caching

- [x] 4.1 Create `packages/startgg-client/src/cache.ts` with caching strategy
- [x] 4.2 Implement in-memory cache with configurable TTL
- [x] 4.3 Add cache invalidation methods
- [x] 4.4 Integrate caching into client (configurable per-method)

## 5. Error Handling

- [x] 5.1 Create typed error classes (RateLimitError, AuthError, GraphQLError)
- [x] 5.2 Add error handling to all client methods

## 6. Testing

- [x] 6.1 Write unit tests for retry logic (9 tests)
- [x] 6.2 Write unit tests for caching (15 tests)
- [x] 6.3 Write integration tests for client methods with mocked responses (16 tests)
- [x] 6.4 Run test suite and ensure all tests pass (40 tests passing)

## 7. Verification

- [x] 7.1 Verify TypeScript compilation passes
- [x] 7.2 Verify package builds successfully
- [x] 7.3 Verify exports are correct in package.json
