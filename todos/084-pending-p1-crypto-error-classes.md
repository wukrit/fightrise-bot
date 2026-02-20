---
status: complete
priority: p1
issue_id: "084"
tags: [code-review, shared, type-safety]
dependencies: []
---

# Crypto Errors Don't Use Custom Error Classes

## Problem Statement

The crypto module in `packages/shared/src/crypto.ts` throws generic `Error` instead of using the project's standardized `ConfigurationError` class. This breaks the consistent error handling pattern established in the codebase.

## Findings

### Evidence

**Location**: `packages/shared/src/crypto.ts:16,21`

```typescript
throw new Error('ENCRYPTION_KEY environment variable is not set');
throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters...`);
```

Should use `ConfigurationError` from `./errors.js`.

### Risk Assessment

- **Severity**: 🔴 CRITICAL
- **Impact**: Inconsistent error handling makes error handling/filtering difficult
- **Likelihood**: High - occurs on every missing config

## Proposed Solutions

### Solution A: Use ConfigurationError (Recommended)
Replace generic Error with ConfigurationError:

```typescript
import { ConfigurationError } from './errors.js';

throw new ConfigurationError('ENCRYPTION_KEY environment variable is not set');
```

**Pros**: Consistent error handling, proper error codes
**Cons**: None
**Effort**: Small
**Risk**: Very Low

## Recommended Action

**Solution A** - Replace generic Error with ConfigurationError in crypto.ts.

## Technical Details

**Affected Files**:
- `packages/shared/src/crypto.ts`

**Error Class**: `ConfigurationError` from `./errors.js`

## Acceptance Criteria

- [ ] All crypto.ts errors use ConfigurationError
- [ ] Error codes are properly assigned

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |

## Resources

- Error handling pattern in `packages/shared/src/errors.ts`
