---
status: complete
priority: p1
issue_id: "68-3"
tags: [code-review, database, data-integrity]
dependencies: []
---

## Problem Statement

The Registration model has no unique constraint on `(eventId, startggEntrantId)`. The code relies on application-level enforcement which is vulnerable to race conditions during concurrent syncs. Duplicate registrations could be created.

## Findings

- **File:** `packages/database/prisma/schema.prisma:215-216`
- Comment says: "Unique constraint on (eventId, startggEntrantId) is enforced at application level during sync to avoid breaking existing data"

## Proposed Solutions

### Solution 1: Add Unique Constraint with Data Migration
- **Pros:** Strong data integrity, prevents race conditions
- **Cons:** Requires data migration to clean duplicates
- **Effort:** Medium
- **Risk:** Medium

### Solution 2: Use Prisma upsert Instead of Check-then-Create
- **Pros:** Atomic operation, no race condition
- **Cons:** Requires refactoring create logic
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- Leave blank for triage -->

## Technical Details

Without unique constraint, concurrent sync operations can both check for existing registration, find none, and create duplicates.

## Acceptance Criteria

- [ ] No duplicate registrations can be created
- [ ] Tests pass

## Work Log

| Date | Action |
|------|--------|
| 2026-02-14 | Created from architecture review |
| 2026-02-14 | Added detailed schema comment explaining limitation and application-level enforcement |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/68
