---
status: complete
priority: p1
issue_id: "68-2"
tags: [code-review, performance, database]
dependencies: []
---

## Problem Statement

The registration sync processes each entrant individually with a separate database transaction, causing O(n) database queries where n = number of entrants. For a 1000-entrant tournament, this results in 4000+ database queries instead of ~10.

## Findings

- **File:** `apps/bot/src/services/registrationSyncService.ts:106-131`
- Each entrant triggers a separate transaction with multiple queries inside
- Pattern: `for (const entrant of entrants) { await this.processEntrant(...) }`

## Proposed Solutions

### Solution 1: Batch All Upserts in Single Transaction
- **Pros:** O(1) queries, significantly faster
- **Cons:** More complex transaction logic
- **Effort:** Medium
- **Risk:** Medium

### Solution 2: Use Prisma createMany/updateMany
- **Pros:** Single query for all creates
- **Cons:** Doesn't handle all cases (linking to existing users)
- **Effort:** Medium
- **Risk:** Low

### Solution 3: Chunk Processing (100 at a time)
- **Pros:** Balance between memory and queries
- **Cons:** Still more queries than batch
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- Leave blank for triage -->

## Technical Details

Inside `processEntrant()`:
- 1x `findFirst` to check existing registration
- 1x potentially `findUnique` to check by user
- 1x potentially `findUnique` to get event (can be moved outside loop)
- 1x `create` or `update` operation

## Acceptance Criteria

- [ ] Reduce database queries from O(n) to O(1)
- [ ] Tests pass

## Work Log

| Date | Action |
|------|--------|
| 2026-02-14 | Created from performance review |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/68
