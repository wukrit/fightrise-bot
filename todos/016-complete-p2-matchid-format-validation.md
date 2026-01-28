---
status: complete
priority: p2
issue_id: "016"
tags: [code-review, security, validation, bot, pr-55]
dependencies: []
---

# Missing matchId Format Validation

## Problem Statement

The `matchId` extracted from button custom IDs is passed directly to database queries without format validation. While Prisma safely handles invalid IDs, this could enable minor enumeration attacks or log pollution.

## Findings

**Identified by**: security-sentinel

**Location**: `/Users/sukritwalia/Documents/Projects/fightrise-bot/apps/bot/src/handlers/scoreHandler.ts` (lines 28-42)

**Evidence**:

```typescript
const [matchId, winnerSlotStr] = parts;
const winnerSlot = parseInt(winnerSlotStr, 10);

// winnerSlot is validated but matchId is NOT
if (isNaN(winnerSlot) || winnerSlot < 1 || winnerSlot > 2) {
  await interaction.reply({ content: 'Invalid button.', ephemeral: true });
  return;
}

// matchId goes directly to database
const result = await reportScore(matchId, interaction.user.id, winnerSlot);
```

## Proposed Solutions

### Option A: Add CUID Regex Validation (Recommended)

**Pros**: Simple, consistent with Prisma's CUID format
**Cons**: None
**Effort**: Small (15 min)
**Risk**: Low

```typescript
const CUID_REGEX = /^c[a-z0-9]{24}$/;

if (!matchId || !CUID_REGEX.test(matchId)) {
  await interaction.reply({ content: 'Invalid button.', ephemeral: true });
  return;
}
```

## Recommended Action

Option A - Add CUID format validation to all three handlers.

## Technical Details

**Affected files**:
- `apps/bot/src/handlers/scoreHandler.ts`

## Acceptance Criteria

- [x] matchId is validated against CUID format before database lookup
- [x] Same validation applied to confirmHandler and disputeHandler

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Identified during PR #55 code review | Validate all user-controlled input format |
| 2026-01-28 | Added CUID_REGEX validation to all three handlers | Simple regex catches malformed IDs early |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/55
