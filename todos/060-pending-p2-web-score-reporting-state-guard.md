---
status: pending
priority: p2
issue_id: "060"
tags: [code-review, concurrency, race-condition]
dependencies: []
---

# Web Score Reporting Missing State Guard

## Problem Statement

The web API route for score reporting does not use the same robust state guard pattern that was added to the bot's dqService.ts. This creates a race condition vulnerability where the match state could change between check and update.

## Findings

**Location:** `apps/web/app/api/matches/[id]/report/route.ts` lines 66-71

```typescript
if (!['CALLED', 'CHECKED_IN', 'IN_PROGRESS', 'PENDING_CONFIRMATION'].includes(match.state)) {
  return NextResponse.json({ error: 'Match is not in a state that allows reporting' }, { status: 400 });
}
```

This is less robust than the bot's approach using `updateMany` with state filter.

## Proposed Solutions

### Solution A: Use updateMany with State Filter (Recommended)
Use Prisma's updateMany with state in WHERE clause for optimistic locking.

**Pros:** Prevents race conditions, consistent with bot pattern

**Cons:** Slightly more complex

**Effort:** Small

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - `apps/web/app/api/matches/[id]/report/route.ts`

## Acceptance Criteria

- [ ] Score reporting uses atomic state guard
- [ ] No race condition between state check and update
- [ ] Consistent with bot's dqService.ts pattern
