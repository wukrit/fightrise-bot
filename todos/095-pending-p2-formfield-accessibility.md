---
status: complete
priority: p2
issue_id: "095"
tags: [code-review, ui, accessibility]
dependencies: []
---

# FormField Missing Label Association

## Problem Statement

The FormField component renders a label but doesn't associate it with any input control. This breaks accessibility requirements for form labels.

## Findings

### Evidence

**Location**: `packages/ui/src/Form.tsx:97-101`

```typescript
<label style={labelStyles}>
  {label}
  {required && <span style={requiredStyles}>*</span>}
</label>
```

The label is not associated with any input. Unlike the Input component (which uses `React.useId()`), FormField doesn't generate an ID or use `htmlFor`.

### Risk Assessment

- **Severity**: 🟡 IMPORTANT (P2)
- **Impact**: Accessibility violation, screen readers can't associate labels with inputs
- **Likelihood**: Medium - users may wrap their own inputs with labels

## Proposed Solutions

### Solution A: Accept id prop and use htmlFor (Recommended)

Add an `id` prop to FormField and use `htmlFor={id}`.

```typescript
export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  id?: string;  // Add this
  // ...
}

export function FormField({
  id,
  // ...
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;

  return (
    <div>
      {label && (
        <label style={labelStyles} htmlFor={fieldId}>
          {label}
          // ...
        </label>
      )}
      {children}  // Note: children should include the input with matching id
    </div>
  );
}
```

**Pros**: Proper accessibility, matches Input component pattern
**Cons**: Requires users to pass matching id to wrapped input
**Effort**: Small
**Risk**: Low - backward compatible change

### Solution B: Document limitation

Document that FormField should only wrap inputs that have their own labels.

**Pros**: No code changes needed
**Cons**: Doesn't fix accessibility issue

## Recommended Action

**Solution A** - Add id prop and proper label association.

## Technical Details

**Affected Files**:
- `packages/ui/src/Form.tsx`

## Acceptance Criteria

- [x] FormField accepts id prop
- [x] Label uses htmlFor to associate with input
- [x] Follows same pattern as Input component

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-24 | Created | Code review finding from PR #111 |
| 2026-02-24 | Completed | Fixed by team agents - added id prop and htmlFor |

## Resources

- WCAG 1.3.1 - Info and Relationships
- React useId hook documentation
