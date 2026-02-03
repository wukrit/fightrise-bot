---
status: complete
priority: p3
issue_id: "034"
tags: [code-review, security, shared, pr-64]
dependencies: []
---

# No Audit Logging for Encryption Operations

## Problem Statement

There's no logging when tokens are encrypted, decrypted, or when key rotation fallback is used. This makes it difficult to audit and troubleshoot encryption-related issues.

**Why it matters**: Security operations should be auditable for compliance and debugging.

## Findings

**Identified by**: security-sentinel

**Location**: `packages/shared/src/crypto.ts`

## Proposed Solutions

### Option A: Add Optional Logger

Accept an optional logger in encryption functions for audit trails.

**Pros**: Auditable, optional
**Cons**: API change, more complexity
**Effort**: Medium (1 hour)
**Risk**: Low

### Option B: Log at Extension Level

Add logging in the Prisma extension where we have context.

**Pros**: More context (user ID, operation type)
**Cons**: Doesn't cover direct crypto usage
**Effort**: Small (30 min)
**Risk**: Low

### Option C: Accept No Logging

Keep encryption operations silent.

**Pros**: No change, simpler
**Cons**: Harder to audit/debug
**Effort**: None
**Risk**: Low

## Recommended Action

Option C - Accept no logging for now. Add if compliance requires it.

## Technical Details

**Affected files**:
- `packages/shared/src/crypto.ts`
- `packages/database/src/extensions/encryption.ts`

## Acceptance Criteria

- [ ] Add audit logging
- [ ] Or document as future improvement

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | Audit logging aids compliance |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
