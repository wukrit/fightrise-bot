---
status: pending
priority: p2
issue_id: "104"
tags: [code-review, logging, bot]
dependencies: []
---

# Inconsistent Logging - Console vs Pino

## Problem Statement

The codebase uses a mix of `console.*` calls and the structured Pino logger. Services and commands use `console.error` while `lib/logger.ts` provides Pino.

**Why it matters:** Inconsistent logging makes production debugging difficult. Structured logs are essential for log aggregation and analysis.

## Findings

**Locations:**
- `services/tournamentService.ts:164,176,197,338,376` - console.error
- `services/matchService.ts:48-163` - console.error/warn/log
- `services/registrationSyncService.ts:166,201,208,250` - console.error/log
- `commands/admin.ts:131,266,269,365` - console.error
- `commands/register.ts:69,222` - console.error
- `commands/tournament.ts:110,271,362` - console.error

## Proposed Solutions

### Solution 1: Replace Console with Pino (Recommended)

Replace all console.* calls with the imported logger.

```typescript
import { logger } from '../lib/logger.js';
// Instead of console.error('msg', err)
logger.error({ err, extra: 'context' }, 'message');
```

| Aspect | Assessment |
|--------|------------|
| Pros | Structured logging, proper log levels |
| Cons | Update all files |
| Effort | Medium |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- All service files
- All command files

## Acceptance Criteria

- [ ] All console.* replaced with logger
- [ ] Log levels appropriate (error/warn/info)
- [ ] Structured metadata included

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from bot review | Found in bot-code-reviewer agent |

## Resources

- Pino.js documentation
- Node.js Logging Best Practices
