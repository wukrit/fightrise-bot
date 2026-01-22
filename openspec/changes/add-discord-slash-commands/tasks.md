# Tasks for add-discord-slash-commands

## 1. Command Infrastructure

- [x] 1.1 Create command interface/type definitions (`apps/bot/src/types.ts`)
- [x] 1.2 Create command loader utility (`apps/bot/src/utils/commandLoader.ts`)
- [x] 1.3 Create command registration script (`apps/bot/src/deploy-commands.ts`)
- [x] 1.4 Add `deploy` script to `apps/bot/package.json`

## 2. Event Handler Infrastructure

- [x] 2.1 Create event interface/type definitions
- [x] 2.2 Create event loader utility (`apps/bot/src/utils/eventLoader.ts`)
- [x] 2.3 Create ready event handler (`apps/bot/src/events/ready.ts`)
- [x] 2.4 Create interactionCreate event handler (`apps/bot/src/events/interactionCreate.ts`)
- [x] 2.5 Create error event handler (`apps/bot/src/events/error.ts`)

## 3. Core Bot Refactoring

- [x] 3.1 Refactor `apps/bot/src/index.ts` to use command and event loaders
- [x] 3.2 Add graceful shutdown handling (SIGINT, SIGTERM)
- [x] 3.3 Extend Discord.js Client type with commands collection

## 4. Slash Command Implementations

- [x] 4.1 Create `/tournament` command group with `setup` and `status` subcommands
- [x] 4.2 Create `/register` command
- [x] 4.3 Create `/link-startgg` command
- [x] 4.4 Create `/my-matches` command
- [x] 4.5 Create `/checkin` command
- [x] 4.6 Create `/report` command

## 5. Testing

- [x] 5.1 Write unit tests for command loader utility
- [x] 5.2 Write unit tests for event loader utility
- [x] 5.3 Write integration tests for command handlers (mock Discord interactions)
- [x] 5.4 Run full test suite and ensure all tests pass (14 tests passing)

## 6. Verification

- [x] 6.1 Verify bot loads all commands without errors
- [x] 6.2 Verify bot loads all events without errors
- [x] 6.3 Verify TypeScript compilation passes via `npx tsc --noEmit`
