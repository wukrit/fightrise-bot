---
status: complete
priority: p3
issue_id: "68-7"
tags: [code-review, simplicity]
dependencies: []
---

## Problem Statement

The registration sync service has custom retry logic with exponential backoff, but the StartGGClient is already configured with retries in the constructor. This is redundant code that adds complexity without benefit.

## Findings

- **File:** `apps/bot/src/services/registrationSyncService.ts:240-266`
- Methods: `fetchWithRetry()`, `sleep()`
- Note: Client has `retry: { maxRetries: 3 }`

## Proposed Solutions

### Solution 1: Remove Custom Retry Logic
- **Pros:** ~25 LOC removed, simpler code
- **Cons:** Lose custom rate-limit handling
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Removed custom retry logic since StartGGClient already handles 429 rate limit errors with exponential backoff.

## Acceptance Criteria

- [x] Custom retry code removed
- [x] Tests pass

## Work Log

| Date | Action |
|------|--------|
| 2026-02-14 | Created from code simplicity review |
| 2026-02-14 | Removed redundant fetchWithRetry and sleep methods |
| 2026-02-14 | Verified TypeScript compiles and bot tests pass |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/68
