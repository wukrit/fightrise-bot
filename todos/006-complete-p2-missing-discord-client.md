---
status: complete
priority: p2
issue_id: "68-6"
tags: [code-review, functionality]
dependencies: []
---

## Problem Statement

During tournament setup, the Discord client is not passed to syncEventRegistrations, so new registration notifications won't be sent. This is a regression in functionality - users won't get notified of new Start.gg registrations during tournament setup.

## Findings

- **File:** `apps/bot/src/services/tournamentService.ts:318-335`
- Code: `const syncResult = await this.registrationSyncService.syncEventRegistrations(event.id);`
- Missing: discordClient parameter

## Proposed Solutions

### Solution 1: Pass Discord Client to TournamentService
- **Pros:** Notifications work during setup
- **Cons:** Need to pass client through call chain
- **Effort:** Medium
- **Risk:** Low

### Solution 2: Skip Notifications During Setup (Document)
- **Pros:** Simpler implementation
- **Cons:** Reduced functionality
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Implemented Solution 1: Pass Discord Client to TournamentService

- Modified `setupTournament` to accept optional `discordClient` parameter
- Modified `saveTournamentConfig` to accept and pass through `discordClient`
- Updated command handler in `tournament.ts` to pass `interaction.client` to the service
- Updated TypeScript declaration files (.d.ts) to match

## Acceptance Criteria

- [x] Notifications sent during tournament setup
- [x] Tests pass

## Work Log

| Date | Action |
|------|--------|
| 2026-02-14 | Created from TypeScript review |
| 2026-02-14 | Fixed by passing discordClient through setupTournament -> saveTournamentConfig -> syncEventRegistrations |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/68
