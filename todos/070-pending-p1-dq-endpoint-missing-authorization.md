---
status: complete
priority: p1
issue_id: "070"
tags: [code-review, security, api]
dependencies: []
---

# Missing Authorization in DQ Endpoint

## Problem Statement

The DQ API endpoint verifies authentication but does NOT verify the user has authority to DQ players. Any authenticated user can DQ any player in any match.

**Why it matters:** Critical security vulnerability - any authenticated user can disqualify any player.

## Findings

**Location:** `apps/web/app/api/matches/[id]/dq/route.ts` (lines 46-96)

The endpoint only checks authentication, not authorization:
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.discordId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// Missing: Check if user is admin OR a match participant
```

Compare to admin register endpoint which correctly checks:
```typescript
const adminCheck = await prisma.tournamentAdmin.findFirst({
  where: {
    userId: user.id,
    tournamentId,
    role: { in: [AdminRole.OWNER, AdminRole.ADMIN] },
  },
});
```

## Proposed Solutions

### Solution A: Add Tournament Admin Check (Recommended)
- **Description:** Add authorization check that user is tournament admin or match participant
- **Pros:** Matches existing pattern in admin register endpoint
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```typescript
// Add after user lookup (line 58)
// Check if user is admin for the tournament
const tournamentAdmin = await prisma.tournamentAdmin.findFirst({
  where: {
    userId: user.id,
    tournamentId: match.event.tournamentId,
    role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
  },
});

if (!tournamentAdmin) {
  return NextResponse.json(
    { error: 'Not authorized to DQ players in this tournament' },
    { status: 403 }
  );
}
```

## Recommended Action

Solution A - Add tournament admin authorization check.

## Technical Details

**Affected Files:**
- `apps/web/app/api/matches/[id]/dq/route.ts`

## Acceptance Criteria

- [ ] DQ endpoint requires admin permissions
- [ ] Non-admins receive 403 Forbidden

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |

## Resources

- PR: #97
