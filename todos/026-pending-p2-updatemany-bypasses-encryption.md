---
status: pending
priority: p2
issue_id: "026"
tags: [code-review, security, database, pr-64]
dependencies: []
---

# updateMany Bypasses Encryption Silently

## Problem Statement

The Prisma extension logs a warning but allows `updateMany` to set `startggToken` in plaintext. This could accidentally store unencrypted tokens if someone uses `updateMany` instead of individual updates.

**Why it matters**: Silent bypasses of security controls lead to accidental vulnerabilities.

## Findings

**Identified by**: data-integrity-guardian, security-sentinel

**Location**: `packages/database/src/extensions/encryption.ts:160-169`

**Evidence**:
```typescript
async updateMany({ args, query }) {
  if (args.data?.startggToken) {
    console.warn(
      '[Encryption] updateMany with startggToken not supported - use individual updates'
    );
  }
  return query(args);  // Allows plaintext through!
}
```

## Proposed Solutions

### Option A: Throw on updateMany with Token (Recommended)

Convert warning to an error that prevents the operation.

**Pros**: Fail-closed, prevents accidental plaintext storage
**Cons**: Breaking if anyone uses updateMany (unlikely)
**Effort**: Small (10 min)
**Risk**: Low

```typescript
async updateMany({ args, query }) {
  if (args.data?.startggToken) {
    throw new Error(
      '[Encryption] updateMany with startggToken not supported. Use individual updates for encryption.'
    );
  }
  return query(args);
}
```

### Option B: Encrypt in Batch

Fetch all matching records, encrypt individually, update in batch.

**Pros**: Supports the use case
**Cons**: Complex, performance implications, N+1 pattern
**Effort**: Large (2+ hours)
**Risk**: Medium

## Recommended Action

Option A - Throw an error. There's no legitimate use case for bulk-updating OAuth tokens.

## Technical Details

**Affected files**:
- `packages/database/src/extensions/encryption.ts`

## Acceptance Criteria

- [ ] updateMany throws if startggToken is in data
- [ ] Error message is clear and suggests alternative
- [ ] Tests verify the throwing behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 security review | Security bypasses should throw, not warn |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
