---
status: complete
priority: p1
issue_id: "022"
tags: [code-review, security, scripts, pr-64]
dependencies: []
---

# Rollback Script Doesn't Use decryptWithRotation

## Problem Statement

The rollback script (`scripts/rollback-encrypt-tokens.ts`) uses `decrypt()` instead of `decryptWithRotation()`. If a key rotation was performed before rollback, the rollback will fail to decrypt tokens encrypted with the previous key, causing **data loss**.

**Why it matters**: Rollback is a disaster recovery path. If it fails after key rotation, you've lost access to OAuth tokens entirely.

## Findings

**Identified by**: data-integrity-guardian, security-sentinel

**Location**: `scripts/rollback-encrypt-tokens.ts:68`

**Evidence**:
```typescript
// Current code uses decrypt() only
const decrypted = decrypt(user.startggToken, encryptionKey);

// Should use decryptWithRotation() like migration does
const decrypted = decryptWithRotation(user.startggToken, encryptionKey, previousKey);
```

## Proposed Solutions

### Option A: Use decryptWithRotation (Recommended)

Update rollback script to use `decryptWithRotation()` with optional `ENCRYPTION_KEY_PREVIOUS`.

**Pros**: Handles all scenarios, matches migration pattern
**Cons**: Slightly more complex
**Effort**: Small (15 min)
**Risk**: Low

```typescript
const encryptionKey = process.env.ENCRYPTION_KEY;
const previousKey = process.env.ENCRYPTION_KEY_PREVIOUS;

// In the decrypt loop:
const decrypted = decryptWithRotation(user.startggToken, encryptionKey, previousKey);
```

### Option B: Document Limitation

Document that rollback must be done before key rotation.

**Pros**: No code change
**Cons**: Easy to forget, doesn't solve the actual problem
**Effort**: Minimal
**Risk**: High (documentation doesn't prevent mistakes)

## Recommended Action

Option A - Use decryptWithRotation for consistency and safety.

## Technical Details

**Affected files**:
- `scripts/rollback-encrypt-tokens.ts`

**Test scenario**:
1. Encrypt with key A
2. Rotate to key B (some tokens re-encrypted with B, some still with A)
3. Rollback should decrypt tokens encrypted with either key

## Acceptance Criteria

- [x] Rollback script uses `decryptWithRotation()`
- [x] Rollback script accepts `ENCRYPTION_KEY_PREVIOUS` env var
- [x] Rollback works after key rotation scenario
- [x] Error handling for "neither key works" case

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 security review | Disaster recovery must handle all states |
| 2026-02-03 | Fixed: Changed decrypt() to decryptWithRotation() with previousKey support | Rollback must handle same scenarios as forward migration |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
