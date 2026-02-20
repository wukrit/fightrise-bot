---
status: complete
priority: p2
issue_id: "code-review"
tags: [code-review, database, types]
dependencies: []
---

# Event.state Uses Raw Integer Instead of Enum

## Problem Statement

Unlike Tournament.state and Match.state which use proper Prisma enums, Event.state is typed as Int @default(1). Nothing prevents storing invalid state values.

**Why it matters:** No type safety, magic numbers scattered in code.

## Findings

**Location:** `packages/database/prisma/schema.prisma:102`

```prisma
state           Int       @default(1)
```

## Proposed Solutions

### Solution A: Create EventState enum
- **Description:** Create EventState enum and migrate column
- **Pros:** Type safety, semantic meaning
- **Cons:** Migration required
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

**Solution A** - Create EventState enum.

## Technical Details

**Affected Files:**
- `packages/database/prisma/schema.prisma`
- Service code using Event.state

## Acceptance Criteria

- [x] EventState enum created
- [x] All code uses enum

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-19 | Completed | Added EventState enum and updated code |

## Resources

- Review: Database Layer
