---
status: complete
priority: p2
issue_id: "073"
tags: [code-review, security, database]
dependencies: []
---

# Duplicate Registration Possible in Admin Register

## Problem Statement

The admin register endpoint doesn't check for existing registrations before creating a new one. Could create duplicate registrations for the same user/tournament.

**Why it matters:** Data integrity - duplicate registrations cause confusion.

## Findings

**Location:** `apps/web/app/api/tournaments/[id]/admin/register/route.ts` (lines 98-106)

```typescript
// No check for existing registration
const registration = await prisma.registration.create({
  data: {
    userId: player.id,
    tournamentId,
    source: RegistrationSource.MANUAL,
    status: RegistrationStatus.CONFIRMED,
  },
});
```

## Proposed Solutions

### Solution A: Add Unique Constraint Check (Recommended)
- **Description:** Check for existing registration before creating
- **Pros:** Simple, matches existing patterns
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```typescript
// Before create:
const existing = await prisma.registration.findFirst({
  where: { userId: player.id, tournamentId },
});

if (existing) {
  return NextResponse.json(
    { error: 'Player already registered' },
    { status: 400 }
  );
}
```

## Recommended Action

Solution A - Add duplicate check.

## Technical Details

**Affected Files:**
- `apps/web/app/api/tournaments/[id]/admin/register/route.ts`

## Acceptance Criteria

- [ ] Returns 400 if player already registered

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |

## Resources

- PR: #97
