---
title: Implement responsive UI with shared component library
type: feat
status: active
date: 2026-02-15
---

# Implement Responsive UI with Shared Component Library

## Overview

Build out a comprehensive shared UI component library in packages/ui for the FightRise tournament management web portal. The current package only has 3 basic components (Button, UserAvatar, DiscordIcon) and needs substantial expansion.

## Problem Statement

The web portal lacks consistent, reusable UI components. Each page implements its own styling, leading to inconsistency and maintenance burden. The portal also lacks proper mobile responsiveness and dark mode support.

## Proposed Solution

Expand packages/ui with a comprehensive set of components following the existing inline-style pattern, then update the web app to use these components.

## Implementation Phases

### Phase 1: Foundation & Form Components

- [ ] **Badge** - Status indicators with variants (success, warning, error, info)
- [ ] **Input** - Text input with label, error states, helper text
- [ ] **Select** - Dropdown selection component
- [ ] **Textarea** - Multi-line text input
- [ ] **Form** - Form wrapper with validation handling

### Phase 2: Layout Components

- [ ] **Card** - Content container with header, body, footer
- [ ] **Modal** - Overlay dialog component
- [ ] **Drawer** - Slide-in panel (left/right)
- [ ] **PageWrapper** - Consistent page layout with title, actions

### Phase 3: Data Display

- [ ] **Table** - Data table with sorting, pagination
- [ ] **Skeleton** - Loading placeholder components

### Phase 4: Navigation & Layout

- [ ] **Header** - App header with navigation
- [ ] **Sidebar** - Collapsible navigation sidebar
- [ ] **Footer** - Site footer
- [ ] **Tooltip** - Hover tooltips

### Phase 5: Feedback

- [ ] **Toast** - Toast notification system

### Phase 6: Theme Support

- [ ] **Dark mode** - CSS variables for theme switching
- [ ] **Responsive utils** - Breakpoint helpers

## Technical Approach

### Styling Strategy

Continue using inline React.CSSProperties pattern for consistency:
- Define base styles as typed `Record<string, React.CSSProperties>`
- Merge with variant/size styles
- Support custom overrides via style prop

### Dark Mode Implementation

Use CSS custom properties for theming:
```css
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-border: #e5e5e5;
}

[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-text: #ffffff;
  --color-border: #333333;
}
```

### Export Structure

Update `packages/ui/src/index.ts` to export all new components with their TypeScript types.

## Acceptance Criteria

- [ ] All listed components are implemented and exported
- [ ] Components work in both light and dark themes
- [ ] Components are responsive (work on mobile)
- [ ] All components have basic unit tests
- [ ] Web app is updated to use new components
- [ ] No console errors in web app

## Dependencies

- React 18.x (existing)
- No new external dependencies

## File Locations

New components: `packages/ui/src/<ComponentName>.tsx`
Tests: `packages/ui/src/<ComponentName>.test.tsx`
Updates: `apps/web/app/layout.tsx`, various pages
