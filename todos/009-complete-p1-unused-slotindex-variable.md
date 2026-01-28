---
status: pending
priority: p1
issue_id: "54"
tags: [code-review, dead-code, quality]
dependencies: []
---

# Unused slotIndex Variable in Check-in Handler

## Problem Statement

The `checkinHandler` in `apps/bot/src/handlers/checkin.ts` calculates a `slotIndex` variable from the button's `playerSlot` part, but never uses it. This is dead code that adds confusion and should be removed.

**Why it matters:** Dead code is confusing to future maintainers who might wonder why it exists. It also indicates a potential logic gap - was `slotIndex` intended to be used for validation?

## Findings

**Location:** `apps/bot/src/handlers/checkin.ts:36-42`

```typescript
const [matchId, playerSlot] = parts;
const slotIndex = parseInt(playerSlot, 10) - 1;  // Calculated but never used

if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 1) {
  await interaction.reply({ content: 'Invalid button.', ephemeral: true });
  return;
}
```

The `slotIndex` is only used for validation, but the actual check-in logic in `checkInPlayer()` identifies the player by Discord ID, not by slot index. The validation ensures the button format is correct (slot 1 or 2), but the variable itself is never passed anywhere.

## Proposed Solutions

### Solution A: Remove slotIndex entirely
- **Description:** Keep only the validation logic, remove the unused variable
- **Pros:** Cleaner code, no dead variables
- **Cons:** None
- **Effort:** Small (5 minutes)
- **Risk:** Very Low

```typescript
const [matchId, playerSlot] = parts;
const slot = parseInt(playerSlot, 10);

if (isNaN(slot) || slot < 1 || slot > 2) {
  await interaction.reply({ content: 'Invalid button.', ephemeral: true });
  return;
}
```

### Solution B: Use slotIndex for additional validation
- **Description:** Pass slotIndex to checkInPlayer() to verify user matches expected slot
- **Pros:** Extra layer of validation
- **Cons:** Complicates the service function, may not be necessary since we validate by Discord ID
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

**Solution A** - Remove the unused variable and simplify the validation.

## Technical Details

**Affected Files:**
- `apps/bot/src/handlers/checkin.ts`

**Test Changes Required:**
- Update tests that reference `slotIndex` validation

## Acceptance Criteria

- [ ] `slotIndex` variable is removed or renamed to just `slot`
- [ ] Validation logic still works (slot 1 or 2 only)
- [ ] All tests pass
- [ ] No ESLint warnings about unused variables

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-28 | Created | Identified during code review of PR #54 |

## Resources

- PR #54: https://github.com/sukritwalia/fightrise-bot/pull/54
- Handler file: `apps/bot/src/handlers/checkin.ts:36-42`
