---
status: ready
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

## Proposed Solutions

### Solution A: Add session check to the endpoint
- **Description:** Add NextAuth session verification to the GET handler
- **Pros:** Simple fix, follows existing pattern
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

### Solution B: Use middleware for auth enforcement
- **Description:** Move auth logic to middleware
- **Pros:** Consistent auth for all routes
- **Cons:** More complex
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

**Solution A** - Add session check to the endpoint following the pattern used in other routes.

## Technical Details

**Affected Files:**
- `apps/web/app/api/tournaments/[id]/route.ts`

## Acceptance Criteria

- [ ] GET /api/tournaments/[id] returns 401 without session
- [ ] GET /api/tournaments/[id] returns data with valid session
- [ ] Consistent auth with other tournament endpoints

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Web Portal Domain
