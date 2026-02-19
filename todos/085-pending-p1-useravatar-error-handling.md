---
status: complete
priority: p1
issue_id: "085"
tags: [code-review, ui, accessibility]
dependencies: []
---

# UserAvatar Missing Error Handling

## Problem Statement

The UserAvatar component in `packages/ui/src/UserAvatar.tsx` has no fallback for broken images or missing source URLs. This can lead to broken image icons showing in the UI.

## Findings

### Evidence

**Location**: `packages/ui/src/UserAvatar.tsx:15-29`

```typescript
export function UserAvatar({ src, alt, size = 'md' }: UserAvatarProps) {
  return (
    <img src={src} alt={alt} ... />
  );
}
```

Missing:
- Image load error handling
- Fallback for missing src
- Default avatar fallback

### Risk Assessment

- **Severity**: 🔴 CRITICAL
- **Impact**: Broken images in production UI
- **Likelihood**: High - happens when user changes avatar

## Proposed Solutions

### Solution A: Add Error State and Fallback (Recommended)
Implement error handling with fallback avatar:

```typescript
const [imgError, setImgError] = useState(false);

const handleError = () => {
  setImgError(true);
};

return imgError || !src ? (
  <DefaultAvatar size={size} />
) : (
  <img src={src} alt={alt} onError={handleError} ... />
);
```

**Pros**: Graceful degradation, good UX
**Cons**: Additional state management
**Effort**: Small
**Risk**: Very Low

## Recommended Action

**Solution A** - Add error state handling with fallback avatar.

## Technical Details

**Affected Files**:
- `packages/ui/src/UserAvatar.tsx`

## Acceptance Criteria

- [x] Broken images show fallback avatar
- [x] Missing src shows fallback avatar
- [x] Proper loading state

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |

## Resources

- [React Image Error Handling](https://react.dev/reference/react-dom/components/img#handling-loading-errors)
