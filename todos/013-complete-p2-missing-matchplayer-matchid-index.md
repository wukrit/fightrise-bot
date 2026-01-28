---
status: pending
priority: p2
issue_id: "54"
tags: [code-review, performance, database, index]
dependencies: []
---

# Missing Index on MatchPlayer.matchId

## Problem Statement

The `MatchPlayer` model queries by `matchId` to count checked-in players, but there's no explicit index on this column. While Prisma creates foreign key indexes by default in some databases, PostgreSQL doesn't automatically index foreign keys.

**Why it matters:** As the number of matches grows, counting checked-in players by matchId will become slower without an index. This affects the check-in flow performance.

## Findings

**Location:** `packages/database/prisma/schema.prisma:152-174`

```prisma
model MatchPlayer {
  id              String    @id @default(cuid())
  // ... fields ...
  matchId         String    // No @@index([matchId])
  match           Match     @relation(fields: [matchId], references: [id], onDelete: Cascade)
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])

  @@unique([matchId, startggEntrantId])
  @@index([userId])
  // Missing: @@index([matchId])
}
```

**Query that needs the index:**
```typescript
// apps/bot/src/services/matchService.ts:399-401
const checkedInCount = await prisma.matchPlayer.count({
  where: { matchId, isCheckedIn: true },
});
```

Note: The `@@unique([matchId, startggEntrantId])` constraint creates a composite index that could be used for matchId queries, but a dedicated index would be more efficient for matchId-only lookups.

## Proposed Solutions

### Solution A: Add explicit @@index([matchId])
- **Description:** Add an index declaration to the MatchPlayer model
- **Pros:** Explicit, clear intent, optimal query performance
- **Cons:** Requires migration
- **Effort:** Small
- **Risk:** Very Low

```prisma
model MatchPlayer {
  // ... fields ...

  @@unique([matchId, startggEntrantId])
  @@index([userId])
  @@index([matchId])  // Add this
}
```

### Solution B: Add composite index @@index([matchId, isCheckedIn])
- **Description:** Create index specifically for the check-in count query
- **Pros:** Optimal for the specific query pattern
- **Cons:** More specialized, may not help other matchId queries
- **Effort:** Small
- **Risk:** Very Low

```prisma
@@index([matchId, isCheckedIn])
```

### Solution C: Rely on existing composite unique constraint
- **Description:** The `@@unique([matchId, startggEntrantId])` already creates an index that starts with matchId
- **Pros:** No changes needed
- **Cons:** May be less efficient than dedicated index
- **Effort:** None
- **Risk:** None

## Recommended Action

**Solution A** - Add explicit `@@index([matchId])` for clarity and optimal performance on all matchId queries.

## Technical Details

**Affected Files:**
- `packages/database/prisma/schema.prisma`

**Migration Required:**
- Run `npm run db:push` or create a proper migration

## Acceptance Criteria

- [ ] `@@index([matchId])` added to MatchPlayer model
- [ ] Migration applied successfully
- [ ] No performance regression
- [ ] Index visible in database (can verify with `\d match_player` in psql)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-28 | Created | Identified during code review of PR #54 |

## Resources

- PR #54: https://github.com/sukritwalia/fightrise-bot/pull/54
- Prisma indexes: https://www.prisma.io/docs/concepts/components/prisma-schema/indexes
