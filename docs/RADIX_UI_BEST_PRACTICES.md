# Radix UI Best Practices for FightRise

This document outlines the best practices for using Radix UI primitives in the FightRise frontend.

## Key Principles

### Use `asChild` Prop for Composition
The `asChild` prop allows you to compose Radix primitives with custom components. This gives you full control over the rendered element while gaining all the accessibility and behavior from Radix.

```tsx
import * as Dialog from '@radix-ui/react-dialog';

function MyTrigger({ asChild, children }) {
  return <Dialog.Trigger asChild={asChild}>{children}</Dialog.Trigger>;
}
```

### Leverage `data-state` Attributes
Radix primitives expose state via `data-state` attributes. Use these for styling stateful components.

```css
/* Target open/closed states */
[data-state="open"] { opacity: 1; }
[data-state="closed"] { opacity: 0; }

/* For enter/leave animations */
[data-state="open"],
[data-state="entering"] {
  animation: fadeIn 200ms ease;
}
```

### Use `<Primitive.Portal>` for Overlays
Dialog, Popover, Dropdown Menu, and Tooltip should use Portal to render at the root of the document, avoiding z-index issues.

```tsx
import * as Dialog from '@radix-ui/react-dialog';

function Modal({ open, onOpenChange, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>{children}</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Wrap Primitives in Custom Components
Maintain your API by wrapping Radix primitives in custom wrapper components.

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { tokens } from './tokens.js';

export function Modal({ open, onOpenChange, title, children, ...props }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyles} />
        <Dialog.Content style={contentStyles} {...props}>
          {title && <Dialog.Title style={titleStyles}>{title}</Dialog.Title>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Component Mapping

| Current Component | Radix Primitive | Priority | Notes |
|-------------------|-----------------|----------|-------|
| Modal | `@radix-ui/react-dialog` | HIGH | Use Dialog.Portal, Dialog.Overlay, Dialog.Content |
| Drawer | `@radix-ui/react-dialog` | HIGH | Position content on left/right side |
| Select | `@radix-ui/react-select` | HIGH | Use Select.Portal, Select.Trigger, Select.Content |
| Tooltip | `@radix-ui/react-tooltip` | HIGH | Use Tooltip.Portal, Tooltip.Provider, Tooltip.Root |
| Button | `@radix-ui/react-slot` | MEDIUM | Use Slot for polymorphism |
| Toast | `@radix-ui/react-toast` | MEDIUM | Use Toast.Provider, Viewport, Toast.Root |
| Dropdown Menu | `@radix-ui/react-dropdown-menu` | LOW | Future enhancement |

---

## Components to Keep As-Is

These components are pure layout/display and don't need Radix migration:

- Card, Input, Textarea, Badge (pure layout/display)
- Header, Sidebar, BottomNav, Footer (navigation)
- Table, Skeleton, UserAvatar, DiscordIcon

---

## Styling Pattern

### Modal/Dialog Pattern

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { tokens } from './tokens.js';

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  animation: 'fadeIn 200ms ease',
};

const contentStyles: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: tokens.colors.white,
  borderRadius: tokens.borderRadius.xl,
  boxShadow: tokens.shadows.lg,
  padding: tokens.spacing.lg,
};

export function Modal({ open, onOpenChange, title, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyles} />
        <Dialog.Content style={contentStyles}>
          {title && <Dialog.Title>{title}</Dialog.Title>}
          {children}
          <Dialog.Close asChild>
            <button aria-label="Close">×</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Select Pattern

```tsx
import * as Select from '@radix-ui/react-select';

export function MySelect({ options, value, onValueChange }) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger>
        <Select.Value placeholder="Select..." />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
```

### Tooltip Pattern

```tsx
import * as Tooltip from '@radix-ui/react-tooltip';

export function MyTooltip({ content, children }) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content>
            {content}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
```

---

## Animation Guidelines

Radix uses `data-state` for animations. Common states:

- **Dialog**: `open`, `closed`
- **Select**: `open`, `closed`, `highlighted`
- **Tooltip**: `instant-open`, `delayed-open`, `closed`
- **Toast**: `showing`, `complete`, `unmounted`

### CSS Animation Example

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

[data-state="open"],
[data-state="entering"] {
  animation: slideUp 200ms ease-out;
}

[data-state="closed"],
[data-state="exiting"] {
  animation: fadeIn 200ms ease-in;
}
```

---

## Accessibility Features

Radix primitives provide these accessibility features out of the box:

| Feature | Implementation |
|---------|-----------------|
| Focus trap | Built into Dialog |
| Focus restoration | Return focus to trigger on close |
| Keyboard navigation | Arrow keys for Select, Tooltip |
| Screen reader announcements | ARIA live regions for Toast |
| Escape key handling | Built-in for Dialog, Select, Tooltip |
| Click outside to close | Built into Dialog |

---

## Migration Checklist

When migrating a component:

1. [ ] Install Radix dependency
2. [ ] Replace manual focus management with Radix primitives
3. [ ] Replace manual escape key handler with Radix
4. [ ] Replace focus trap with Radix Dialog
5. [ ] Use Portal for overlay content
6. [ ] Add `data-state` styling
7. [ ] Add enter/exit animations
8. [ ] Test keyboard navigation
9. [ ] Test screen reader compatibility
10. [ ] Verify backward compatibility of API

---

## Testing Checklist

After migration, verify:

- [ ] Focus is trapped within modal/drawer when open
- [ ] Focus returns to trigger element when closed
- [ ] Escape key closes the component
- [ ] Clicking overlay closes the component
- [ ] Arrow keys navigate Select options
- [ ] Tooltip appears after delay
- [ ] Toast announces to screen readers
- [ ] All existing functionality works

---

## Resources

- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)
- [Radix GitHub](https://github.com/radix-ui/primitives)
- [Accessibility Guide](https://www.radix-ui.com/docs/primitives/overview/accessibility)
