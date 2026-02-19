---
status: complete
priority: p2
issue_id: "086"
tags: [code-review, shared, magic-numbers]
dependencies: []
---

# Magic Number Duplication in datetime.ts

## Problem Statement

The datetime module has duplicated magic numbers for minutes-to-milliseconds conversion that should use the shared constant from constants.ts.

## Findings

### Evidence

**Location**: `packages/shared/src/datetime.ts:98,126`

```typescript
const windowEndMs = windowStartMs + windowMinutes * 60 * 1000;
```

Should use `TIME.MINUTES_TO_MS` from `./constants.js`.

### Risk Assessment

- **Severity**: 🟡 IMPORTANT
- **Impact**: Magic numbers reduce maintainability
- **Likelihood**: Low

## Proposed Solutions

### Solution A: Use Constants (Recommended)
```typescript
import { TIME } from './constants.js';

const windowEndMs = windowStartMs + windowMinutes * TIME.MINUTES_TO_MS;
```

**Pros**: Single source of truth
**Cons**: None
**Effort**: Small
**Risk**: Very Low

## Recommended Action

**Solution A** - Use TIME.MINUTES_TO_MS constant from constants.ts.

## Technical Details

**Affected Files**:
- `packages/shared/src/datetime.ts`

## Acceptance Criteria

- [ ] Uses TIME.MINUTES_TO_MS constant

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
