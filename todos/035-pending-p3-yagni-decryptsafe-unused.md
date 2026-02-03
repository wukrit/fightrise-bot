---
status: pending
priority: p3
issue_id: "035"
tags: [code-review, quality, shared, pr-64]
dependencies: []
---

# YAGNI: decryptSafe Function May Be Unused

## Problem Statement

The `decryptSafe()` function that returns `{ success, plaintext/error }` discriminated union was added but may not be used anywhere in the codebase. This adds API surface without clear benefit.

**Why it matters**: YAGNI (You Ain't Gonna Need It) - avoid adding code without use cases.

## Findings

**Identified by**: code-simplicity-reviewer

**Location**: `packages/shared/src/crypto.ts`

**Evidence**: Function exported but no usages found in codebase.

## Proposed Solutions

### Option A: Remove If Unused

Remove `decryptSafe` if no code uses it.

**Pros**: Simpler API, less code
**Cons**: May need it later
**Effort**: Small (10 min)
**Risk**: Low

### Option B: Keep for Future Use

Keep as it enables graceful error handling patterns.

**Pros**: Ready for future use
**Cons**: YAGNI violation
**Effort**: None
**Risk**: Low

## Recommended Action

Option B - Keep it. The function is tested and provides value for safe decryption patterns. Not urgent to remove.

## Technical Details

**Affected files**:
- `packages/shared/src/crypto.ts`

## Acceptance Criteria

- [ ] Remove if unused
- [ ] Or document intended use case

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | Consider YAGNI for new APIs |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
