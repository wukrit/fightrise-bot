---
status: complete
priority: p1
issue_id: "002"
tags: [code-review, performance]
dependencies: []
---

# Sequential Event Processing in pollTournament()

## Problem Statement

Events within a tournament are processed sequentially in a `for...of` loop. Each event's sets are fetched and processed one after another, even though these operations are independent and could run in parallel.

**Why it matters:** During active tournaments with multiple events (e.g., SF6 + Tekken 8), sequential processing doubles or triples the poll latency unnecessarily.

## Findings

**Location:** `apps/bot/src/services/pollingService.ts:132-136`

```typescript
for (const event of tournament.events) {
  const result = await syncEventMatches(event.id, event.startggId);
  matchesCreated += result.created;
  matchesUpdated += result.updated;
}
```

**Evidence from Performance Oracle review:**
- Pattern identified as CRITICAL
- Each event fetch waits for the previous one to complete
- Recommendation: Use `Promise.all` for parallel processing

## Proposed Solutions

### Solution 1: Promise.all (Recommended)

Process all events in parallel using Promise.all.

```typescript
const results = await Promise.all(
  tournament.events.map(event =>
    syncEventMatches(event.id, event.startggId)
  )
);

let matchesCreated = 0;
let matchesUpdated = 0;
for (const result of results) {
  matchesCreated += result.created;
  matchesUpdated += result.updated;
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Significant latency reduction, simple change |
| Cons | Higher concurrent API calls to Start.gg |
| Effort | Small |
| Risk | Low - events are independent |

### Solution 2: Promise.allSettled with Error Handling

Use Promise.allSettled to handle partial failures gracefully.

```typescript
const results = await Promise.allSettled(
  tournament.events.map(event =>
    syncEventMatches(event.id, event.startggId)
  )
);

for (const result of results) {
  if (result.status === 'fulfilled') {
    matchesCreated += result.value.created;
    matchesUpdated += result.value.updated;
  } else {
    console.error(`Event sync failed:`, result.reason);
  }
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | More resilient to partial failures |
| Cons | Slightly more complex |
| Effort | Small |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/services/pollingService.ts`

**Components affected:**
- `pollTournament()` function

## Acceptance Criteria

- [ ] Events are processed in parallel using Promise.all or Promise.allSettled
- [ ] Results are correctly aggregated after parallel execution
- [ ] Error handling preserves current behavior (AuthError propagation)
- [ ] Tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created from code review | Sequential processing identified by performance-oracle |
| 2026-01-28 | Fixed: Changed for...of to Promise.all() in pollTournament() | Events are independent, parallel processing safe |

## Resources

- PR #52: https://github.com/[repo]/pull/52
