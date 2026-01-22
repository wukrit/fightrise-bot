# Change: Add Discord Bot Slash Command System

GitHub Issue: #3

## Why

The Discord bot package exists with basic client initialization but lacks the command and event handling infrastructure needed to process user interactions. Issue #3 requires implementing slash command registration and routing to enable tournament management functionality within Discord.

## What Changes

- Add command registration script to register slash commands with Discord API
- Create command handler structure with dynamic command loading
- Create event handler structure with dynamic event loading
- Implement graceful shutdown handling for clean bot termination
- Register all required slash commands:
  - `/tournament setup` - Configure tournament for Discord server
  - `/tournament status` - View tournament status
  - `/register` - Register for a tournament
  - `/link-startgg` - Link Start.gg account
  - `/my-matches` - View upcoming matches
  - `/checkin` - Check in for current match
  - `/report` - Report match score

## Impact

- Affected specs: `discord-bot` (new capability)
- Affected code:
  - `apps/bot/src/index.ts` - Main entry point refactoring
  - `apps/bot/src/commands/` - New command modules
  - `apps/bot/src/events/` - New event handlers
  - `apps/bot/src/deploy-commands.ts` - New registration script
  - `apps/bot/package.json` - New script entries
