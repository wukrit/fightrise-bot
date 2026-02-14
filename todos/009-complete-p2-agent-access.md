---
status: complete
priority: p2
issue_id: "68-9"
tags: [code-review, agent-native]
dependencies: []
---

## Problem Statement

Agents cannot directly trigger registration sync - they must run a full tournament poll. There's no factory function like getRegistrationSyncService() and no standalone /admin sync command.

## Findings

- RegistrationSyncService class exists but no factory export
- No standalone registration sync command
- Agents must use triggerImmediatePoll() which runs full poll

## Proposed Solutions

### Solution 1: Add Factory Function
- **Pros:** Easy to implement, follows existing pattern
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

### Solution 2: Add Admin Slash Command
- **Pros:** Allows manual trigger
- **Cons:** More code
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

<!-- Leave blank for triage -->

## Acceptance Criteria

- [x] Agents can trigger registration sync directly
- [x] Tests pass

## Work Log

| Date | Action |
|------|--------|
| 2026-02-14 | Created from agent-native review |
| 2026-02-14 | Added getRegistrationSyncService() factory function |

## Implementation Notes

Added factory function following `getTournamentService()` pattern:
- Singleton pattern with lazy initialization
- Reads `STARTGG_API_KEY` from environment
- Throws error if API key is not available
- Updated both `.ts`, `.js`, and `.d.ts` files

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/68
