---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, security, bot]
dependencies: []
---

# Missing Input Validation Before Database Queries

## Problem Statement

While CUID validation exists in scoreHandler, other handlers don't validate input before querying the database. This could lead to unnecessary database load from invalid queries.

**Why it matters:** Unnecessary database load, potential errors.

## Findings

**Location:** `apps/bot/src/handlers/`

- `scoreHandler.ts` validates CUID format ✓
- `checkin.ts` line 31: Only checks `parts.length !== 2` but doesn't validate matchId format

## Proposed Solutions

### Solution A: Add centralized validation
- **Description:** Add validation helpers and use across handlers
- **Pros:** Consistent validation
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Add centralized validation.

## Technical Details

**Affected Files:**
- `apps/bot/src/handlers/*.ts`

## Acceptance Criteria

- [ ] All handlers validate input
- [ ] Consistent validation approach

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Discord Bot Domain
