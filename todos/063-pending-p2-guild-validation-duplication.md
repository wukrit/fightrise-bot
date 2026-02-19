---
status: complete
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

## Resolution

The guild validation helpers were already created in `apps/bot/src/utils/guildValidation.ts`:
- `requireGuild(interaction)` - Returns guildId or null (for autocomplete)
- `requireGuildWithReply(interaction)` - Returns guildId or sends error reply and returns null (for commands)

**Changes made:**
1. Updated `tournament.ts` `handleSetup` to use `requireGuildWithReply` instead of inline validation
2. All three command files (admin.ts, tournament.ts, register.ts) now consistently use the helpers
3. Removed duplicate inline validation in `handleSetup`

## Technical Details

- **Affected Files:**
  - `apps/bot/src/commands/tournament.ts` - Consolidated inline validation to use helper
  - `apps/bot/src/commands/admin.ts` - Already using helpers
  - `apps/bot/src/commands/register.ts` - Already using helpers

## Acceptance Criteria

- [x] Guild validation extracted to helper
- [x] Consistent error handling across commands
