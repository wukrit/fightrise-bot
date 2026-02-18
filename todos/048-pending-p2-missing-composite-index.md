---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, database, performance]
dependencies: []
---

# Missing Composite Index on Match

## Problem Statement

The polling service frequently queries matches by (eventId, state) together. There are separate indexes but no composite index.

**Why it matters:** Less efficient queries, full index scan vs index-only.

## Findings

**Location:** `packages/database/prisma/schema.prisma:146-149`

## Proposed Solutions

### Solution A: Add composite index
- **Description:** Add @@index([eventId, state]) to Match model
- **Pros:** Faster queries
- **Cons:** Slightly larger index
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Add composite index.

## Technical Details

**Affected Files:**
- `packages/database/prisma/schema.prisma`

## Acceptance Criteria

- [ ] Composite index added
- [ ] Query performance improved

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Database Layer
