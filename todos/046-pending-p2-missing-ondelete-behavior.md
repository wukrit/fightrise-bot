---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, database, integrity]
dependencies: []
---

# Missing Explicit onDelete for Relations

## Problem Statement

When MatchPlayer references User via userId, there is no explicit onDelete clause. Behavior is database-engine-dependent. Same issue for Registration, Dispute.

**Why it matters:** Deleting a User could cause dangling references or hard failures.

## Findings

**Location:** `packages/database/prisma/schema.prisma:188, 278, 282, 244`

```prisma
userId          String?
user            User?     @relation(fields: [userId], references: [id])
// Missing: onDelete: SetNull
```

## Proposed Solutions

### Solution A: Add explicit onDelete
- **Description:** Add explicit onDelete: SetNull to optional relations
- **Pros:** Clear intent, consistent behavior
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Add explicit onDelete to all optional relations.

## Technical Details

**Affected Files:**
- `packages/database/prisma/schema.prisma`

## Acceptance Criteria

- [ ] Explicit onDelete on all optional relations
- [ ] Consistent behavior

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Database Layer
