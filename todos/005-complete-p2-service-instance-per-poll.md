---
status: complete
priority: p2
issue_id: "68-5"
tags: [code-review, performance, architecture]
dependencies: []
---

## Problem Statement

A new RegistrationSyncService instance is created on every poll cycle in pollingService. This is inefficient and creates a new StartGGClient each time with its own cache (which is disabled anyway).

## Findings

- **File:** `apps/bot/src/services/pollingService.ts:146-148`
- Code: `const registrationSyncService = new RegistrationSyncService(process.env.STARTGG_API_KEY || '');`

## Proposed Solutions

### Solution 1: Create Service Once at Module Level
- **Pros:** Reuses service, better resource management
- **Cons:** Need to ensure proper initialization
- **Effort:** Small
- **Risk:** Low

### Solution 2: Pass Service from startPollingService
- **Pros:** Dependency injection pattern
- **Cons:** More refactoring
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

<!-- Leave blank for triage -->

## Acceptance Criteria

- [x] Service instance created once
- [x] Tests pass

## Work Log

| Date | Action |
|------|--------|
| 2026-02-14 | Created from review |
| 2026-02-14 | Fixed by creating service instance once at startup and using getter function (Solution 1) |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/68
