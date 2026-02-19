---
status: complete
priority: p1
issue_id: "code-review"
tags: [code-review, security, web, authentication]
dependencies: []
---

# Unauthenticated Tournament Endpoint

## Problem Statement

The GET endpoint at `/api/tournaments/[id]` has **no authentication** - it returns all tournament data including Discord guild IDs, channel IDs, and settings to anyone who requests it.

**Why it matters:** Exposes internal tournament configuration, Discord channel IDs, and potentially sensitive settings to unauthenticated users.

## Findings

**Location:** `apps/web/app/api/tournaments/[id]/route.ts:1-40`

```typescript
// No session check at all!
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Anyone can access this without auth
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { events: true, _count: { ... } },
  });
```

## Resolution

**Solution A** was implemented - session check added to the endpoint following the pattern used in other routes.

The endpoint now verifies the NextAuth session and returns 401 if not authenticated:

```typescript
const session = await getServerSession(authOptions);

if (!session?.user?.discordId) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

## Technical Details

**Affected Files:**
- `apps/web/app/api/tournaments/[id]/route.ts`

## Acceptance Criteria

- [x] GET /api/tournaments/[id] returns 401 without session
- [x] GET /api/tournaments/[id] returns data with valid session
- [x] Consistent auth with other tournament endpoints

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-19 | Resolved | Authentication already implemented in codebase |

## Resources

- Review: Web Portal Domain
