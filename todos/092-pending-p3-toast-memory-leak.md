---
status: complete
priority: p3
issue_id: "092"
tags: [code-review, ui, bug]
dependencies: []
---

# Toast Memory Leak Potential

## Problem Statement

The Toast component's setTimeout is not cleaned up if the component unmounts, potentially causing memory leaks.

## Findings

### Evidence

**Location**: `packages/ui/src/Toast.tsx:107-118`

```typescript
const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
  // ...
  if (duration > 0) {
    setTimeout(() => {  // No cleanup on unmount
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }
}, []);
```

### Risk Assessment

- **Severity**: 🔵 NICE-TO-HAVE
- **Impact**: Memory leak on rapid component unmounts
- **Likelihood**: Low

## Proposed Solutions

### Solution A: Use useEffect Cleanup (Recommended)
```typescript
useEffect(() => {
  return () => {
    // Cleanup timeouts on unmount
  };
}, []);
```

**Pros**: Proper cleanup
**Cons**: None
**Effort**: Small
**Risk**: Very Low

## Recommended Action

**Solution A** - Add useEffect cleanup for setTimeout.

## Technical Details

**Affected Files**:
- `packages/ui/src/Toast.tsx`

## Acceptance Criteria

- [ ] Timeouts cleaned up on unmount

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
