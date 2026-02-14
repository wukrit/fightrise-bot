---
status: complete
priority: p3
issue_id: "68-8"
tags: [code-review, simplicity]
dependencies: []
---

## Problem Statement

Dead code in processEntrant - the result of regMap.get() is discarded and does nothing.

## Findings

- **File:** `apps/bot/src/services/registrationSyncService.ts:290`
- Code: `regMap.get(entrant.id); // Pre-fetch into cache`

## Proposed Solutions

### Solution 1: Remove the Line
- **Pros:** Removes confusion
- **Cons:** None
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

<!-- Leave blank for triage -->

## Acceptance Criteria

- [x] Dead code removed

## Work Log

| Date | Action |
|------|--------|
| 2026-02-14 | Created from code simplicity review |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/68
