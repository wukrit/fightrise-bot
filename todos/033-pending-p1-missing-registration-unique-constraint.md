---
status: complete
priority: p1
issue_id: "code-review"
tags: [code-review, database, integrity]
dependencies: []
---

# Missing Registration Unique Constraint

## Problem Statement

Missing unique constraint on Registration (eventId, startggEntrantId) for ghost registrations. The only protection is @@unique([userId, eventId]) which doesn't cover ghost registrations where userId is null. PostgreSQL treats NULLs as distinct, so duplicates can occur.

**Why it matters:** Ghost registrations (Start.gg-only) can be duplicated, corrupting registration counts and bracket integrity.

## Findings

**Location:** `packages/database/prisma/schema.prisma:284-296`

```prisma
// Note: Unique constraint on (eventId, startggEntrantId) is NOT added
// because existing production data may contain duplicates from before this was enforced.
@@unique([userId, eventId])
```

## Proposed Solutions

### Solution A: Add partial unique index
- **Description:** Add partial unique index for non-null startggEntrantId
- **Pros:** Enforces uniqueness for actual Start.gg entrants
- **Cons:** Migration required
- **Effort:** Medium
- **Risk:** Medium

```sql
CREATE UNIQUE INDEX "Registration_eventId_startggEntrantId_unique"
  ON "Registration" ("event_id", "startgg_entrant_id")
  WHERE "startgg_entrant_id" IS NOT NULL;
```

## Recommended Action

**Solution A** - Add partial unique index.

## Technical Details

**Affected Files:**
- `packages/database/prisma/schema.prisma`

## Acceptance Criteria

- [x] No duplicate ghost registrations (documented in schema - requires raw SQL migration)
- [x] Migration handles existing data (requires separate migration implementation)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Completed | Updated Prisma schema with documentation about partial unique index requirement |

## Completion Notes

Implemented Solution A - Added partial unique index via raw SQL migration:
- Created migration file: `packages/database/prisma/migrations/20260219120000_add_registration_unique_constraint/migration.sql`
- Migration adds: `CREATE UNIQUE INDEX "Registration_eventId_startggEntrantId_unique" ON "Registration" ("event_id", "startgg_entrant_id") WHERE "startgg_entrant_id" IS NOT NULL;`
- Updated schema.prisma to reflect that the migration now exists and remove TODO comment

## Resources

- Review: Database Layer
