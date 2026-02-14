---
status: complete
priority: p2
issue_id: "68-4"
tags: [code-review, performance]
dependencies: [68-2]
---

## Problem Statement

The event is fetched inside the transaction for EVERY entrant that doesn't have an existing registration. Since eventId is constant for all entrants in the loop, this is redundant and wasteful.

## Findings

- **File:** `apps/bot/src/services/registrationSyncService.ts:367-371`
- Code: `const event = await tx.event.findUnique({ where: { id: eventId } });`

## Proposed Solutions

### Solution 1: Fetch Event Once Before Loop
- **Pros:** Simple fix, significant query reduction
- **Cons:** Need to pass event data to processEntrant
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- Leave blank for triage -->

## Acceptance Criteria

- [x] Event fetched once, not per-entrant
- [x] Tests pass

## Work Log

| Date | Action |
|------|--------|
| 2026-02-14 | Created from performance review |
| 2026-02-14 | Implemented fix: fetch event once before loop at line 56-63, pass tournamentId to processEntrant |
| 2026-02-14 | Updated tests to mock prisma.event.findUnique outside transaction |
| 2026-02-14 | All tests pass |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/68
