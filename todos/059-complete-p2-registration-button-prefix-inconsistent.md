---
status: complete
priority: p2
issue_id: "059"
tags: [code-review, agent-native, button-interactions]
dependencies: []
---

# Inconsistent Registration Button Prefix

## Problem Statement

The registration handler uses hardcoded prefix `'reg'` instead of the defined constant `INTERACTION_PREFIX.REGISTER` (`'register'`). This creates inconsistency that can confuse agent developers.

## Findings

**Location:** `apps/bot/src/handlers/registration.ts` line 7

The handler uses `'reg'` but `apps/bot/src/commands/admin.ts` uses `reg-approve:`, `reg-reject:`, `reg-info:` format.

## Proposed Solutions

### Solution A: Use Consistent Prefix (Recommended)
Update registration.ts to use `INTERACTION_PREFIX.REGISTER` and update admin.ts to match.

**Pros:** Consistent, follows defined constants

**Cons:** Requires updates in multiple files

**Effort:** Small

## Resolution

**Changes made:**
1. `apps/bot/src/handlers/registration.ts`:
   - Added import for `INTERACTION_PREFIX` from `@fightrise/shared`
   - Changed handler prefix from hardcoded `'reg'` to `INTERACTION_PREFIX.REGISTER` (`'register'`)

2. `apps/bot/src/commands/admin.ts`:
   - Added import for `INTERACTION_PREFIX` from `@fightrise/shared`
   - Updated button custom IDs from `reg-approve:`, `reg-reject:`, `reg-info:` to `register:approve:`, `register:reject:`, `register:info:`

All registration button prefixes now use the consistent `register:` format matching the `INTERACTION_PREFIX.REGISTER` constant.

## Technical Details

- **Affected Files:**
  - `apps/bot/src/handlers/registration.ts`
  - `apps/bot/src/commands/admin.ts`

## Acceptance Criteria

- [x] All registration button prefixes use consistent format
- [x] Matches INTERACTION_PREFIX constants
- [x] Agent developers can rely on constants
