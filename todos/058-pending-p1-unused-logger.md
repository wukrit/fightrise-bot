---
status: complete
priority: p1
issue_id: "058"
tags: [code-review, architecture, logging]
dependencies: []
---

# Logger Not Being Used

## Problem Statement

The project has a pino logger configured in `apps/bot/src/lib/logger.ts` but zero services or commands import it. All bot code uses `console.log/error/warn` instead.

## Resolution

Fixed the following files to use the pino logger instead of console.*:

- `/home/ubuntu/fightrise-bot/apps/bot/src/index.ts` - Main bot entry point
- `/home/ubuntu/fightrise-bot/apps/bot/src/deploy-commands.ts` - Command deployment script
- `/home/ubuntu/fightrise-bot/apps/bot/src/commands/link-startgg.ts` - Link Start.gg command
- `/home/ubuntu/fightrise-bot/apps/bot/src/commands/unlink-startgg.ts` - Unlink Start.gg command
- `/home/ubuntu/fightrise-bot/apps/bot/src/commands/tournament.ts` - Tournament command
- `/home/ubuntu/fightrise-bot/apps/bot/src/commands/my-matches.ts` - My matches command

The logger was already correctly used in:
- `/home/ubuntu/fightrise-bot/apps/bot/src/events/interactionCreate.ts`
- `/home/ubuntu/fightrise-bot/apps/bot/src/services/pollingService.ts`

## Changes Made

1. Added `import { logger } from '../lib/logger.js';` to each file
2. Replaced `console.log()` with `logger.info()`
3. Replaced `console.warn()` with `logger.warn()`
4. Replaced `console.error()` with `logger.error({ err: error }, 'message')`

## Notes

Additional files in services and handlers still use console.* and could be migrated in a follow-up effort. The core entry points and commands now use the pino logger correctly.
