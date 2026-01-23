# Change: Implement /tournament setup command

GitHub Issue: #8

## Why

Tournament admins need a way to link their Start.gg tournaments to their Discord server. The `/tournament setup` command is the entry point for all tournament functionality - without it, users cannot configure matches, registrations, or any tournament features in their Discord server.

## What Changes

### Command Implementation
- Implement `/tournament setup` slash command handler with:
  - `slug` (required): Start.gg tournament slug
  - `match-channel` (required): Discord channel for match threads

### User Verification Flow
1. Check if the Discord user has a linked Start.gg account in the database
2. If not linked, respond with instructions to use `/link-startgg` first

### Tournament Fetch & Validation
1. Fetch tournament data from Start.gg API using the provided slug
2. If tournament not found, return a clear error message
3. Validate the user is an admin of the tournament (check via `getTournamentsByOwner()`)

### Database Operations
1. Create or update `Tournament` record with Start.gg data and Discord config
2. Create or update `Event` records for each tournament event
3. Create `TournamentAdmin` record linking the user as OWNER
4. Create or update `GuildConfig` with the match channel

### Polling Job Setup
- Mark the tournament for polling by setting initial `pollIntervalMs`
- Note: BullMQ job infrastructure will be added in a future issue

### Confirmation Response
- Send an embed with tournament details:
  - Tournament name and dates
  - Number of events
  - Linked match channel
  - Current state

## Impact

- Affected specs: `tournament-setup` (new capability)
- Affected code:
  - `apps/bot/src/commands/tournament.ts` - Implement setup subcommand
  - `apps/bot/src/services/tournamentService.ts` - New service for business logic
  - `packages/startgg-client/` - May need additional queries for admin validation
- Dependencies:
  - Requires `@fightrise/database` for persistence
  - Requires `@fightrise/startgg-client` for API access

## Error Handling

| Scenario | Response |
|----------|----------|
| User not linked to Start.gg | "Please link your Start.gg account first using `/link-startgg`" |
| Tournament not found | "Tournament not found. Please check the slug and try again." |
| User not tournament admin | "You must be an admin of this tournament on Start.gg to set it up." |
| Tournament already configured | Show current config with option to update |
| API error | "Failed to connect to Start.gg. Please try again later." |

## Non-Goals (Out of Scope)

- BullMQ job queue implementation (future issue)
- Match thread creation logic
- `/link-startgg` implementation (separate issue)
- OAuth flow for Start.gg linking
