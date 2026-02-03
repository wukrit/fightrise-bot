---
status: complete
priority: p2
issue_id: "030"
tags: [code-review, quality, shared, pr-64]
dependencies: []
---

# Missing Custom Error Types for Encryption

## Problem Statement

Encryption operations throw generic `Error` objects with string messages. This makes programmatic error handling difficult - callers must parse error messages to determine the type of failure.

**Why it matters**: Proper error types enable better error handling and more informative error messages to users.

## Findings

**Identified by**: pattern-recognition-specialist, architecture-strategist

**Location**: `packages/shared/src/crypto.ts`

**Evidence**:
```typescript
// Current - generic errors
throw new Error('ENCRYPTION_KEY must be 32 bytes');
throw new Error('Data is not encrypted or uses unknown format');

// Should be typed errors
throw new EncryptionKeyError('Key must be 32 bytes');
throw new InvalidFormatError('Not encrypted or unknown format');
```

## Proposed Solutions

### Option A: Create Custom Error Classes (Recommended)

Define typed error classes for encryption failures.

**Pros**: Programmatic handling, better type safety
**Cons**: More code
**Effort**: Small (30 min)
**Risk**: Low

```typescript
// packages/shared/src/errors.ts
export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class InvalidKeyError extends EncryptionError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidKeyError';
  }
}

export class DecryptionError extends EncryptionError {
  constructor(public readonly reason: 'INVALID_FORMAT' | 'WRONG_KEY' | 'CORRUPTED', message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}
```

### Option B: Use Error Codes

Add error codes to generic errors.

**Pros**: Simpler than classes
**Cons**: Less type-safe, still requires parsing
**Effort**: Small (20 min)
**Risk**: Low

## Recommended Action

Option B or accept current state - This is a nice-to-have for this phase.

## Technical Details

**Affected files**:
- `packages/shared/src/errors.ts` (new)
- `packages/shared/src/crypto.ts` (update throws)
- `packages/shared/src/index.ts` (export errors)

## Acceptance Criteria

- [ ] Custom error classes created
- [ ] crypto.ts updated to use typed errors
- [ ] Errors exported from shared package
- [ ] Or document as future improvement

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | Typed errors improve DX |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
