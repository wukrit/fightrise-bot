---
status: complete
priority: p2
issue_id: "code-review"
tags: [code-review, database, performance]
dependencies: []
---

# Redundant Indexes on Unique Fields

## Problem Statement

discordGuildId has @unique which creates unique index. The additional @@index([discordGuildId]) is redundant. Same for discordId and startggId on User.

**Why it matters:** Wastes disk space, increases write overhead.

## Findings

**Location:** `packages/database/prisma/schema.prisma:39-40, 336-347`

```prisma
discordGuildId  String    @unique
@@index([discordGuildId]) // Redundant!
```

## Proposed Solutions

### Solution A: Remove redundant indexes
- **Description:** Remove @@index entries for unique fields
- **Pros:** Cleaner schema, less storage
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Remove redundant indexes.

## Technical Details

**Affected Files:**
- `packages/database/prisma/schema.prisma`

## Acceptance Criteria

- [x] No redundant indexes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-19 | Completed | Removed redundant indexes from User and GuildConfig models |

## Resources

- Review: Database Layer
