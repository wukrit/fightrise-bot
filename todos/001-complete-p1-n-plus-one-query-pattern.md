---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, performance, database]
dependencies: []
---

# N+1 Query Pattern in processSet()

## Problem Statement

The `processSet()` function in `pollingService.ts` executes a database query for every set in every event during each poll cycle. For tournaments with hundreds of sets, this creates significant database load and latency.

**Why it matters:** This is a critical performance issue that will cause slow polling and database strain during active tournaments when response time matters most.

## Findings

**Location:** `apps/bot/src/services/pollingService.ts:203-205`

```typescript
const existingMatch = await prisma.match.findUnique({
  where: { startggSetId: set.id },
});
```

This query runs inside a loop processing each set. For a tournament with 64 players in double elimination (127 sets), this generates 127 individual database queries per poll.

**Evidence from Performance Oracle review:**
- Pattern identified as CRITICAL
- Recommendation: Batch fetch all matches for the event before processing

## Proposed Solutions

### Solution 1: Batch Prefetch (Recommended)

Fetch all existing matches for the event in a single query before processing sets.

```typescript
async function syncEventMatches(eventId: string, startggEventId: string) {
  // Prefetch all existing matches for this event
  const existingMatches = await prisma.match.findMany({
    where: { eventId },
    select: { id: true, startggSetId: true, state: true },
  });
  const matchMap = new Map(existingMatches.map(m => [m.startggSetId, m]));

  // Now process sets using the map lookup (O(1) instead of O(n) queries)
  for (const set of setsConnection.nodes) {
    const existingMatch = matchMap.get(set.id);
    // ... rest of processing
  }
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Reduces queries from N to 1, simple implementation |
| Cons | Slightly higher memory for large tournaments |
| Effort | Small |
| Risk | Low |

### Solution 2: Upsert Pattern

Use Prisma's upsert to combine check and create in one operation.

| Aspect | Assessment |
|--------|------------|
| Pros | Single query per set |
| Cons | Still O(n) queries, just fewer round trips |
| Effort | Small |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/services/pollingService.ts`

**Database changes:** None required

**Components affected:**
- `syncEventMatches()` function
- `processSet()` function signature may need to accept match map

## Acceptance Criteria

- [ ] Match lookup uses batch prefetch instead of individual queries
- [ ] Database query count for polling is O(events) not O(sets)
- [ ] Existing tests continue to pass
- [ ] New test verifies batch behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created from code review | N+1 identified by performance-oracle agent |
| 2026-01-28 | Fixed: Added batch prefetch in syncEventMatches() | Map lookup is O(1) vs O(n) database queries |

## Resources

- PR #52: https://github.com/[repo]/pull/52
- Performance Oracle review findings
