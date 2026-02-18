---
status: ready
priority: p1
issue_id: "code-review"
tags: [code-review, database, integrity]
dependencies: []
---

# User Model Allows All Identity Fields Null

## Problem Statement

Every identity field on User (discordId, startggId, email) is nullable with no database-level constraint ensuring at least one identity exists. A prisma.user.create({ data: {} }) call will succeed, creating a phantom user.

**Why it matters:** Orphaned User rows with no identity cannot be looked up or cleaned, affecting counts and queries.

## Findings

**Location:** `packages/database/prisma/schema.prisma:11-29`

```prisma
discordId       String?   @unique
startggId       String?   @unique
email           String?   @unique
```

## Proposed Solutions

### Solution A: Add CHECK constraint
- **Description:** Add database-level CHECK constraint via raw SQL migration
- **Pros:** Enforces at least one identity
- **Cons:** Migration required
- **Effort:** Medium
- **Risk:** Medium

```sql
ALTER TABLE "User" ADD CONSTRAINT "User_has_identity"
  CHECK ("discordId" IS NOT NULL OR "startggId" IS NOT NULL OR "email" IS NOT NULL);
```

## Recommended Action

**Solution A** - Add CHECK constraint.

## Technical Details

**Affected Files:**
- `packages/database/prisma/schema.prisma`

## Acceptance Criteria

- [ ] Users must have at least one identity
- [ ] No phantom users possible

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Database Layer
