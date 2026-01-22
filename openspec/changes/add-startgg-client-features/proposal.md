# Change: Enhance Start.gg GraphQL API Client

GitHub Issue: #4

## Why

The `@fightrise/startgg-client` package has basic query implementations but lacks strong TypeScript types, the `getTournamentsByOwner` query, rate limiting/retry logic, and response caching. These features are required for robust tournament management functionality.

## What Changes

- Add comprehensive TypeScript type definitions for all Start.gg API responses
- Implement `getTournamentsByOwner(userId)` query for listing admin tournaments
- Add rate limiting with exponential backoff retry logic
- Implement response caching with configurable TTL
- Add unit tests for all client methods
- Add error handling with typed error responses

## Impact

- Affected specs: `startgg-client` (new capability)
- Affected code:
  - `packages/startgg-client/src/index.ts` - Client enhancements
  - `packages/startgg-client/src/types.ts` - New type definitions
  - `packages/startgg-client/src/cache.ts` - Caching implementation
  - `packages/startgg-client/src/retry.ts` - Retry logic
