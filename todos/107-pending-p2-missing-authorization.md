---
status: pending
priority: p2
issue_id: "107"
tags: [code-review, security, api]
dependencies: []
---

# Missing Authorization in Discord Guilds API

## Problem Statement

The `/api/discord/guilds` endpoint only checks authentication, not authorization. Any authenticated user can see all guild configs.

**Why it matters:** Users should only see guilds they are admin of.

## Findings

**Location:** `apps/web/app/api/discord/guilds/route.ts:11-52`

```typescript
// Only checks authentication, not admin status
const session = await getServerSession(authOptions);
if (!session?.user?.discordId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Proposed Solutions

### Solution 1: Check Tournament Admin Status (Recommended)

Verify user is admin of the guild before returning data.

| Aspect | Assessment |
|--------|------------|
| Pros | Proper authorization |
| Cons | Additional query |
| Effort | Small |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/web/app/api/discord/guilds/route.ts`

## Acceptance Criteria

- [ ] Users only see guilds they admin
- [ ] Authorization check added

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from web review | Found in web-code-reviewer agent |
