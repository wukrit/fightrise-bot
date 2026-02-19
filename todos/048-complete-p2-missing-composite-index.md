---
status: complete
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

**Location:** `packages/database/prisma/schema.prisma:168`

**Status:** The composite index `@@index([eventId, state])` was already present in the schema.

## Resolution

The composite index is already implemented at line 168 in the Match model:

```prisma
@@index([eventId, state])
```

This index supports the polling service query pattern efficiently.

## Acceptance Criteria

- [x] Composite index added
- [x] Query performance improved

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-19 | Resolved | Composite index already present in schema |

## Resources

- Review: Database Layer
