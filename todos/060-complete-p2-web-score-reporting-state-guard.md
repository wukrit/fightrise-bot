---
status: complete
priority: p2
issue_id: "060"
tags: [code-review, concurrency, race-condition]
dependencies: []
---

# Web Score Reporting Missing State Guard

## Problem Statement

The web API route for score reporting does not use the same robust state guard pattern that was added to the bot's dqService.ts. This creates a race condition vulnerability where the match state could change between check and update.

## Findings

**Location:** `apps/web/app/api/matches/[id]/report/route.ts` lines 108-134

The web route already implements the proper state guard pattern using:
- `prisma.$transaction` for atomic operations
- `updateMany` with state filter in WHERE clause (lines 117-124)
- Race condition detection via `matchUpdate.count === 0` (lines 127-134)
- Consistent with the bot's dqService.ts pattern

## Resolution

The state guard was already implemented correctly. The code uses:
- Atomic `updateMany` with state in WHERE clause for optimistic locking
- Transaction wrapper for atomicity
- Race condition detection with appropriate error handling

## Technical Details

- **Affected Files:**
  - `apps/web/app/api/matches/[id]/report/route.ts`

## Acceptance Criteria

- [x] Score reporting uses atomic state guard
- [x] No race condition between state check and update
- [x] Consistent with bot's dqService.ts pattern
