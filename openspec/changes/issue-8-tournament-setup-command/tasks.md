# Tasks for issue-8-tournament-setup-command

## 1. Create Tournament Service

- [x] 1.1 Create `apps/bot/src/services/tournamentService.ts` with TournamentService class
- [x] 1.2 Implement `setupTournament()` method that orchestrates the setup flow
- [x] 1.3 Implement `fetchAndValidateTournament()` to get tournament from Start.gg
- [x] 1.4 Implement `validateUserIsAdmin()` to check user has admin rights
- [x] 1.5 Implement `saveTournamentConfig()` to persist to database

## 2. Update Tournament Command

- [x] 2.1 Add `match-channel` option to the setup subcommand
- [x] 2.2 Implement user Start.gg link verification
- [x] 2.3 Call TournamentService and handle responses
- [x] 2.4 Create success embed with tournament details
- [x] 2.5 Add proper error handling with user-friendly messages

## 3. Handle Edge Cases

- [x] 3.1 Handle tournament already configured in guild (offer update)
- [x] 3.2 Normalize tournament slug (strip URL prefix if provided)
- [x] 3.3 Use deferReply for long-running API calls

## 4. Testing

- [x] 4.1 Write unit tests for TournamentService methods
- [x] 4.2 Write integration tests for tournament setup command flow
- [x] 4.3 Add MSW handlers for getTournamentsByOwner if needed
- [x] 4.4 Test error scenarios (not linked, not found, not admin)

## 5. Verification

- [x] 5.1 All unit tests pass (`npm run test`)
- [x] 5.2 All integration tests pass (`npm run test:integration`)
- [x] 5.3 Linting passes (`npm run lint`)
- [x] 5.4 Build and type check successful

## 6. E2E Verification

Manual verification steps for the `/tournament setup` command:

- [ ] 6.1 Deploy commands to Discord test server (`npm run deploy-commands`)
- [ ] 6.2 Verify `/tournament setup` appears in Discord slash commands
- [ ] 6.3 Test with unlinked user → Shows "link-startgg" prompt (USER_NOT_LINKED)
- [ ] 6.4 Test with linked user but no OAuth → Shows OAuth required message (OAUTH_REQUIRED)
- [ ] 6.5 Test with invalid slug → Shows "not found" error (TOURNAMENT_NOT_FOUND)
- [ ] 6.6 Test with valid tournament but not admin → Shows "permission denied" (NOT_ADMIN)
- [ ] 6.7 Test with valid tournament as admin → Shows success embed with events

**Note:** Full E2E testing requires:
- Start.gg OAuth implementation (separate issue)
- Test Discord server with bot deployed
- Start.gg tournament with admin access for testing
