---
status: pending
priority: p2
issue_id: "024"
tags: [load-test, mock-server, msw, testing]
dependencies: []
---

# Mock Server Implementation Incomplete

## Problem Statement

The load test plan requires a mock Start.gg GraphQL server but the implementation is incomplete. There is no GraphQL schema defined for the mock server, which means load tests cannot simulate realistic API responses.

**Why it matters:** Without a proper mock server, load tests cannot run in isolation and will either fail or make real API calls. This defeats the purpose of load testing.

## Findings

**Evidence from Agent Native Reviewer:**

The review identified:
1. Mock server implementation missing
2. No GraphQL schema defined
3. Cannot simulate realistic Start.gg API responses

**Current state:**
- Existing MSW handlers in `packages/startgg-client/src/__mocks__/handlers.ts` exist for unit/integration tests
- These handlers are for specific query/mutation scenarios, not load testing
- No load-test-specific mock server infrastructure

**What's needed for load testing:**
- GraphQL schema matching Start.gg API
- Mock resolvers that return realistic data volumes
- Rate limit simulation (return 429 responses)
- Latency injection (200-800ms delays)
- Error scenario handling

## Proposed Solutions

### Solution 1: Extend Existing MSW Handlers for Load Testing

Build on existing MSW infrastructure.

```typescript
// apps/bot/src/load-test/mocks/startgg.ts
import { setupServer } from 'msw/node';
import { graphql } from 'msw';

// Import existing handlers and extend for load testing
import { eventSetsHandler, eventEntrantsHandler } from '@fightrise/startgg-client';

export const createLoadTestServer = (options: {
  latencyMs?: number;
  errorRate?: number;
  rateLimitEnabled?: boolean;
}) => {
  const latency = options.latencyMs ?? 200;

  // Wrap handlers with latency injection
  const handlers = [
    graphql.operation((req, res, ctx) => {
      // Inject latency
      return res(ctx.delay(latency + Math.random() * 600));

      // Inject errors based on rate
      if (options.errorRate && Math.random() < options.errorRate) {
        return res(
          ctx.status(500),
          ctx.data({ errors: [{ message: 'Simulated error' }] })
        );
      }

      // Continue to actual handlers...
    }),
    // ... existing handlers
  ];

  return setupServer(...handlers);
};
```

### Solution 2: Use GraphQL Tools to Generate Mock Server

Use @graphql-tools/mock and @graphql-tools/schema:

```typescript
// apps/bot/src/load-test/mocks/schema.ts
import { addMocksToSchema } from '@graphql-tools/mock';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';

// Define minimal schema for load testing
const typeDefs = `
  type Query {
    event(id: ID!): Event
    tournament(id: ID!): Tournament
  }

  type Event {
    id: ID!
    name: String!
    sets(page: Int, perPage: Int): SetConnection
    entrants(page: Int, perPage: Int): EntrantConnection
  }

  type Tournament {
    id: ID!
    name: String!
    events: [Event]
  }

  type SetConnection {
    nodes: [Set]
    pageInfo: PageInfo
  }

  type Set {
    id: ID!
    fullRoundText: String
    round: Int
    state: Int
    slots: [Slot]
  }

  type Slot {
    entrant: Entrant
    standing: Standing
  }

  type Entrant {
    id: ID!
    name: String!
    participants: [Participant]
  }

  type Participant {
    user: User
  }

  type User {
    id: ID!
    name: String
  }

  type Standing {
    stats: StandingStats
  }

  type StandingStats {
    score: Score
  }

  type Score {
    value: Int
  }

  type PageInfo {
    totalPages: Int
    hasNextPage: Boolean
  }

  type EntrantConnection {
    nodes: [Entrant]
    pageInfo: PageInfo
  }
`;

const schema = makeExecutableSchema({ typeDefs });

// Add mocks for realistic data volumes
export const mockSchema = addMocksToSchema({
  schema,
  mocks: {
    Event: () => ({
      name: 'Street Fighter 6 Singles',
    }),
    Set: () => ({
      id: () => `set-${Math.random().toString(36).substr(2, 9)}`,
      fullRoundText: () => 'Quarter Finals',
      round: () => Math.floor(Math.random() * 10) + 1,
      state: () => 2, // READY
    }),
  },
});
```

| Aspect | Assessment |
|--------|------------|
| Pros | Complete control over mock behavior, supports all scenarios |
| Cons | Requires schema definition |
| Effort | Medium |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**New files needed:**
- `apps/bot/src/load-test/mocks/startgg.ts` - Mock server setup
- `apps/bot/src/load-test/mocks/schema.ts` - GraphQL schema
- `apps/bot/src/load-test/mocks/handlers.ts` - Request handlers

**Existing resources to leverage:**
- `packages/startgg-client/src/__mocks__/handlers.ts` - Existing MSW handlers
- `packages/startgg-client/src/__mocks__/fixtures.ts` - Test fixtures

**Dependencies potentially needed:**
- `@graphql-tools/schema`
- `@graphql-tools/mock`

## Acceptance Criteria

- [ ] Mock GraphQL server can handle event sets query
- [ ] Mock GraphQL server can handle entrants query
- [ ] Latency injection works (200-800ms)
- [ ] Rate limit simulation works (429 responses)
- [ ] Load test can run independently without real API calls

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-17 | Created from Agent Native Reviewer review | MSW exists but not configured for load testing |
