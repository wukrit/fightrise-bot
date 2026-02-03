---
status: complete
priority: p1
issue_id: "020"
tags: [code-review, security, web, pr-64]
dependencies: []
---

# Web App Missing Encryption Key Validation at Startup

## Problem Statement

The bot app validates `ENCRYPTION_KEY` at startup using `validateEncryptionKey()`, but the web app (`apps/web`) does not. If the web app starts with an invalid or missing key, OAuth token operations will fail at runtime rather than at startup, making issues harder to diagnose.

**Why it matters**: Silent runtime failures are worse than loud startup failures. Users could authenticate, and token encryption would fail silently or throw cryptic errors.

## Findings

**Identified by**: security-sentinel, architecture-strategist

**Location**: `apps/web/` - No startup validation exists

**Evidence**:
- Bot has validation at `apps/bot/src/index.ts:18-20`
- Web app has no equivalent validation

## Proposed Solutions

### Option A: Add Validation to Next.js Instrumentation (Recommended)

Add validation in `apps/web/instrumentation.ts` which runs at server startup.

**Pros**: Runs once at startup, standard Next.js pattern
**Cons**: Requires Next.js 15+ experimental feature
**Effort**: Small (15 min)
**Risk**: Low

```typescript
// apps/web/instrumentation.ts
export async function register() {
  if (process.env.NODE_ENV === 'production') {
    const { validateEncryptionKey } = await import('@fightrise/shared');
    validateEncryptionKey(process.env.ENCRYPTION_KEY);
  }
}
```

### Option B: Add Validation to Next.js Config

Add validation in `next.config.js` (runs at build/start time).

**Pros**: Simple, no new files
**Cons**: Runs at build time, may not catch runtime issues
**Effort**: Small (10 min)
**Risk**: Low

## Recommended Action

Option A - Use Next.js instrumentation for proper startup validation.

## Technical Details

**Affected files**:
- `apps/web/instrumentation.ts` (new file)
- `apps/web/next.config.js` (enable instrumentation)

## Acceptance Criteria

- [x] Web app validates ENCRYPTION_KEY at startup in production
- [x] Invalid/missing key causes immediate startup failure with clear error
- [x] Development mode allows missing key (for local testing)
- [x] Error message matches bot's error message for consistency

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 security review | Both apps need parity for fail-fast behavior |
| 2026-02-03 | Fixed: Created apps/web/instrumentation.ts with inline key validation | Used inline validation to avoid webpack bundling issues with node:crypto |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
- Next.js Instrumentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
