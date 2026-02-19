---
status: complete
priority: p2
issue_id: "061"
tags: [code-review, code-quality, duplication]
dependencies: []
---

# Code Duplication in admin.ts

## Problem Statement

The permission verification code is duplicated in both register and registrations handlers within admin.ts (lines 121-128 and 271-278).

## Findings

```typescript
const member = await interaction.guild?.members.fetch(adminId);
if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
  await interaction.editReply({
    content: 'You need Manage Server permissions to use admin commands.',
  });
  return;
}
```

## Proposed Solutions

### Solution A: Extract to Helper Function (Recommended)
Create `verifyAdminPermissions(interaction, tournamentId)` helper.

**Pros:** DRY principle, single source of truth

**Effort:** Small

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - `apps/bot/src/commands/admin.ts`

## Acceptance Criteria

- [ ] Permission check extracted to reusable helper
- [ ] No code duplication in admin.ts
