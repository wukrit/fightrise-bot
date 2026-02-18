---
status: pending
priority: p1
issue_id: "058"
tags: [code-review, architecture, logging]
dependencies: []
---

# Logger Not Being Used

## Problem Statement

The project has a pino logger configured in `apps/bot/src/lib/logger.ts` but zero services or commands import it. All bot code uses `console.log/error/warn` instead.

## Findings

1. Logger file exists: `apps/bot/src/lib/logger.ts` - 30 lines of configuration
2. No imports found - grep shows zero usage
3. 80+ occurrences of `console.log/error/warn` in bot code

## Proposed Solutions

### Solution A: Replace console.* with logger (Recommended)
Update all services to import and use the configured logger.

**Pros:** Structured logging, consistent format, service context

**Cons:** Requires updating many files

**Effort:** Medium

### Solution B: Keep console for now, add TODO
Add a tech debt item to migrate later.

**Pros:** No immediate change

**Cons:** Technical debt accumulates

**Effort:** Small

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - All files in `apps/bot/src/services/`
  - All files in `apps/bot/src/commands/`
  - `apps/bot/src/lib/logger.ts` (existing but unused)

## Acceptance Criteria

- [ ] All bot services use pino logger instead of console.*
- [ ] Logs include service name context
- [ ] Consistent log format across all services
