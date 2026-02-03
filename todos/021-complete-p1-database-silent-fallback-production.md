---
status: complete
priority: p1
issue_id: "021"
tags: [code-review, security, database, pr-64]
dependencies: []
---

# Database Package Allows Silent Fallback in Production

## Problem Statement

When `ENCRYPTION_KEY` is not set in production, the database package only logs a warning and returns an unencrypted PrismaClient. This "fail-open" behavior means OAuth tokens could be stored unencrypted in production without any app-level failure.

**Why it matters**: Security controls should fail-closed, not fail-open. Storing plaintext OAuth tokens in production is a P1 security issue.

## Findings

**Identified by**: security-sentinel, data-integrity-guardian

**Location**: `packages/database/src/index.ts:24-30`

**Evidence**:
```typescript
if (!encryptionKey) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[Database] WARNING: ENCRYPTION_KEY not set - OAuth tokens will NOT be encrypted'
    );
  }
  return basePrisma;  // Returns unencrypted client!
}
```

## Proposed Solutions

### Option A: Throw in Production (Recommended)

Change the warning to a hard error in production mode.

**Pros**: Fail-closed security, prevents accidental plaintext storage
**Cons**: Existing deployments without key will break (good - forces fix)
**Effort**: Small (10 min)
**Risk**: Medium (breaking change for existing deployments)

```typescript
if (!encryptionKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Database] ENCRYPTION_KEY is required in production for OAuth token encryption'
    );
  }
  return basePrisma;
}
```

### Option B: Add Explicit Opt-Out Flag

Require explicit `ENCRYPTION_DISABLED=true` to skip encryption in production.

**Pros**: Prevents accidents, allows explicit opt-out for edge cases
**Cons**: More complex, edge case for opt-out is hard to justify
**Effort**: Small (15 min)
**Risk**: Low

## Recommended Action

Option A - Throw in production. There's no valid reason to store OAuth tokens unencrypted in production.

## Technical Details

**Affected files**:
- `packages/database/src/index.ts`

**Breaking change**: Yes - existing production deployments without ENCRYPTION_KEY will fail to start.

**Migration path**:
1. Generate key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Add to production environment
3. Run migration script to encrypt existing tokens

## Acceptance Criteria

- [x] Production mode throws error if ENCRYPTION_KEY is missing
- [x] Development mode continues to allow missing key (with warning)
- [x] Error message is clear and actionable
- [x] Existing tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 security review | Fail-closed > fail-open for security |
| 2026-02-03 | Fixed: Added build-time detection to avoid breaking Next.js build | Check NEXT_PHASE env var to distinguish build from runtime |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
