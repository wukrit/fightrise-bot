---
status: pending
priority: p2
issue_id: "029"
tags: [code-review, quality, scripts, pr-64]
dependencies: []
---

# Code Duplication Between Migration Scripts

## Problem Statement

`migrate-encrypt-tokens.ts` and `rollback-encrypt-tokens.ts` share significant code: argument parsing, dry-run logic, batch processing, progress reporting. Changes to one script may need to be replicated in the other.

**Why it matters**: DRY violation increases maintenance burden and risk of drift.

## Findings

**Identified by**: pattern-recognition-specialist, code-simplicity-reviewer

**Location**:
- `scripts/migrate-encrypt-tokens.ts`
- `scripts/rollback-encrypt-tokens.ts`

**Duplicated code**:
- Argument parsing (~20 lines)
- Batch fetching logic (~15 lines)
- Progress reporting (~10 lines)
- Transaction handling (~20 lines)

## Proposed Solutions

### Option A: Extract Shared Module (Recommended)

Create `scripts/lib/migration-utils.ts` with shared utilities.

**Pros**: DRY, easier maintenance
**Cons**: Adds abstraction layer
**Effort**: Small (30 min)
**Risk**: Low

```typescript
// scripts/lib/migration-utils.ts
export function parseArgs(): { dryRun: boolean; force: boolean };
export function processBatch<T>(items: T[], batchSize: number, processor: (batch: T[]) => Promise<void>);
export function reportProgress(current: number, total: number, label: string);
```

### Option B: Accept Duplication

Keep scripts independent for clarity and safety.

**Pros**: Each script is self-contained, easier to understand
**Cons**: Maintenance burden, risk of drift
**Effort**: None
**Risk**: Low

## Recommended Action

Option B for now - Accept duplication. These are one-time migration scripts, not frequently modified code.

## Technical Details

**Affected files**:
- `scripts/migrate-encrypt-tokens.ts`
- `scripts/rollback-encrypt-tokens.ts`
- `scripts/lib/migration-utils.ts` (new, if implementing Option A)

## Acceptance Criteria

- [ ] Document decision to accept duplication
- [ ] Or extract shared utilities

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | One-time scripts can tolerate some duplication |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
