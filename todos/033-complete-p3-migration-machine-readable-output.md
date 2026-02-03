---
status: complete
priority: p3
issue_id: "033"
tags: [code-review, quality, scripts, pr-64]
dependencies: []
---

# Migration Scripts Lack Machine-Readable Output

## Problem Statement

The migration and rollback scripts output human-readable text to console. For CI/CD integration or monitoring, machine-readable output (JSON) would be more useful.

**Why it matters**: Automation and monitoring are easier with structured output.

## Findings

**Identified by**: agent-native-reviewer

**Location**:
- `scripts/migrate-encrypt-tokens.ts`
- `scripts/rollback-encrypt-tokens.ts`

## Proposed Solutions

### Option A: Add --json Flag

Add optional `--json` flag for structured output.

**Pros**: Backwards compatible, supports automation
**Cons**: More code
**Effort**: Small (30 min)
**Risk**: Low

### Option B: Accept Current State

Keep human-readable output - these are manual scripts.

**Pros**: No change
**Cons**: Harder to automate
**Effort**: None
**Risk**: Low

## Recommended Action

Option B - Accept current state. These are one-time manual scripts.

## Technical Details

**Affected files**:
- `scripts/migrate-encrypt-tokens.ts`
- `scripts/rollback-encrypt-tokens.ts`

## Acceptance Criteria

- [ ] Add --json flag
- [ ] Or document as future improvement

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | Machine-readable output aids automation |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
