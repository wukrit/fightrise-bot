---
status: complete
priority: p1
issue_id: "code-review"
tags: [code-review, security, bot, authorization]
dependencies: []
---

# Authorization Gap in Admin Commands

## Problem Statement

The admin command only checks TournamentAdmin in the database but does not verify the user has Discord administrative permissions at the guild level. A user could be added as tournament admin but then removed from Discord admin role, yet still retain access.

**Why it matters:** Users could retain admin access after being removed from Discord admin roles.

## Findings

**Location:** `apps/bot/src/commands/admin.ts:120-133`

```typescript
const admin = await prisma.tournamentAdmin.findFirst({
  where: {
    user: { discordId: adminId },
    tournamentId,
  },
});
// No check for guild-level permissions (ManageGuild, etc.)
```

## Proposed Solutions

### Solution A: Add Discord permission check
- **Description:** Verify user has ManageGuild permission alongside database check
- **Pros:** Aligns with Discord permission model
- **Cons:** Additional API call
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Add Discord permission check alongside database check.

## Technical Details

**Affected Files:**
- `apps/bot/src/commands/admin.ts` (already had checks)
- `apps/bot/src/handlers/registration.ts` (added missing checks)

## Acceptance Criteria

- [x] Checks Discord permissions in addition to database
- [x] Works for both role-based and permission-based admins

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-19 | Fixed | Added Discord permission checks to registration.ts |

## Resources

- Review: Discord Bot Domain
