---
status: pending
priority: p2
issue_id: "54"
tags: [code-review, performance, database]
dependencies: []
---

# Duplicate Database Query in Check-in Handler

## Problem Statement

The check-in handler makes two separate database calls to fetch essentially the same data:
1. `checkInPlayer()` queries the match with players
2. `getMatchStatus()` queries the match with players again

This is inefficient and could be optimized to a single query.

**Why it matters:** Each database round-trip adds latency. For a responsive Discord interaction, minimizing database calls improves user experience.

## Findings

**Location:** `apps/bot/src/handlers/checkin.ts:45-56`

```typescript
// First query - in checkInPlayer()
const result = await checkInPlayer(matchId, interaction.user.id);

// Second query - in getMatchStatus()
if (result.success) {
  const match = await getMatchStatus(matchId);  // Queries same data again
  // ... uses match to build embed
}
```

Both functions query the match with players included, resulting in redundant database work.

## Proposed Solutions

### Solution A: Return match data from checkInPlayer()
- **Description:** Extend `CheckInResult` to optionally include match status data when check-in succeeds
- **Pros:** Single database query, cleaner handler
- **Cons:** Slightly larger return type
- **Effort:** Medium
- **Risk:** Low

```typescript
interface CheckInResult {
  success: boolean;
  message: string;
  bothCheckedIn: boolean;
  matchStatus?: MatchStatus;  // Include when success=true
}
```

### Solution B: Cache the query result in checkInPlayer()
- **Description:** Use a short-lived cache (few seconds) to avoid duplicate queries
- **Pros:** No API changes
- **Cons:** Added complexity, cache invalidation concerns
- **Effort:** Medium
- **Risk:** Medium

### Solution C: Accept current implementation
- **Description:** Keep separate queries for cleaner separation of concerns
- **Pros:** Simpler code, clear function responsibilities
- **Cons:** Redundant database call
- **Effort:** None
- **Risk:** None (just performance)

## Recommended Action

**Solution A** - Extend CheckInResult to include match status on success. This is a clean solution that maintains the agent-native interface while optimizing the common case.

## Technical Details

**Affected Files:**
- `apps/bot/src/services/matchService.ts` - `checkInPlayer()`, `CheckInResult` interface
- `apps/bot/src/handlers/checkin.ts` - Use returned match status instead of calling `getMatchStatus()`
- `apps/bot/src/handlers/__tests__/checkin.test.ts` - Update mocks

## Acceptance Criteria

- [ ] `CheckInResult` includes optional `matchStatus` field
- [ ] `checkInPlayer()` returns match status when success=true
- [ ] Handler uses returned status instead of calling `getMatchStatus()`
- [ ] Tests updated to mock new return format
- [ ] Performance improvement measurable (optional)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-28 | Created | Identified during code review of PR #54 |

## Resources

- PR #54: https://github.com/sukritwalia/fightrise-bot/pull/54
- `checkInPlayer()`: `apps/bot/src/services/matchService.ts:319-430`
- `getMatchStatus()`: `apps/bot/src/services/matchService.ts:281-309`
