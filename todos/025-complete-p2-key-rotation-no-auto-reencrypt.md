---
status: complete
priority: p2
issue_id: "025"
tags: [code-review, security, database, pr-64]
dependencies: []
---

# Key Rotation Doesn't Auto-Re-encrypt Tokens

## Problem Statement

When a new encryption key is deployed with `ENCRYPTION_KEY_PREVIOUS` set, the system can decrypt old tokens but doesn't automatically re-encrypt them with the new key. This means old-key tokens persist indefinitely.

**Why it matters**: Key rotation should eventually result in all tokens using the new key. Currently, you'd need to run a separate migration script.

## Findings

**Identified by**: security-sentinel, architecture-strategist

**Location**: `packages/database/src/extensions/encryption.ts`

**Evidence**: The extension decrypts with rotation but writes back with only the current key. However, read operations don't write, so old tokens stay encrypted with old key.

## Proposed Solutions

### Option A: Re-encrypt on Read (Recommended for Security)

When decrypting with the previous key, immediately re-encrypt and update the record with the current key.

**Pros**: Automatic migration, no manual intervention
**Cons**: Extra write on first read per token, complexity
**Effort**: Medium (1 hour)
**Risk**: Medium (adds write during read)

```typescript
async findUnique({ args, query }) {
  const result = await query(args);
  if (result && shouldDecryptToken(args)) {
    const decrypted = decryptWithRotation(result.startggToken, currentKey, previousKey);
    // If it was encrypted with previous key, re-encrypt with current
    if (wasDecryptedWithPreviousKey) {
      await prisma.user.update({
        where: { id: result.id },
        data: { startggToken: encrypt(decrypted, currentKey) }
      });
    }
    result.startggToken = decrypted;
  }
  return result;
}
```

### Option B: Background Re-encryption Job

Create a scheduled job that re-encrypts all old-key tokens.

**Pros**: No read-path writes, controlled timing
**Cons**: Requires job infrastructure, tokens stay on old key until job runs
**Effort**: Medium (1-2 hours)
**Risk**: Low

### Option C: Document Manual Process

Document that admins should run migration script after key rotation.

**Pros**: Simple, explicit
**Cons**: Manual step could be forgotten
**Effort**: Minimal
**Risk**: Low

## Recommended Action

Option C for now - Document the manual process. Auto-re-encryption adds complexity that may not be needed for the current scale.

## Technical Details

**Affected files**:
- `packages/database/src/extensions/encryption.ts` (if implementing auto-reencrypt)
- `docs/` (for documenting manual process)

## Acceptance Criteria

- [ ] Document key rotation procedure including re-encryption step
- [ ] Or implement auto-re-encryption on read

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 security review | Key rotation UX matters for security operations |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
