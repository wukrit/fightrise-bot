---
status: pending
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

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - `apps/bot/src/handlers/registration.ts`
  - `apps/bot/src/commands/admin.ts`

## Acceptance Criteria

- [ ] All registration button prefixes use consistent format
- [ ] Matches INTERACTION_PREFIX constants
- [ ] Agent developers can rely on constants
