---
status: pending
priority: p2
issue_id: "063"
tags: [code-review, code-quality, duplication]
dependencies: []
---

# Duplicate guildId Validation Pattern

## Problem Statement

The same guildId validation appears 9+ times across multiple command files.

## Findings

```typescript
if (!guildId) {
  await interaction.reply({ content: '...', ephemeral: true });
  return;
}
```

**Files affected:**
- `apps/bot/src/commands/admin.ts` (3 times)
- `apps/bot/src/commands/tournament.ts` (3 times)
- `apps/bot/src/commands/register.ts` (2 times)

## Proposed Solutions

### Solution A: Create requireGuild Helper (Recommended)
Extract to reusable `requireGuild(interaction)` helper.

**Pros:** DRY, consistent error messages

**Effort:** Small

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - Multiple files in `apps/bot/src/commands/`

## Acceptance Criteria

- [ ] Guild validation extracted to helper
- [ ] Consistent error handling across commands
