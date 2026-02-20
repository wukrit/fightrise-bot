---
status: complete
priority: p2
issue_id: "088"
tags: [code-review, web, architecture]
dependencies: []
---

# Over-Reliance on Client-Side Rendering

## Problem Statement

Most pages in the web portal use client-side rendering with 'use client' instead of leveraging Next.js Server Components. This results in slower initial loads, worse SEO, and larger client-side bundles.

## Findings

### Evidence

**Location**: Multiple pages in `apps/web/app/`

Most pages use:
```typescript
'use client'

import { useEffect, useState } from 'react';

// Fetching data in useEffect
useEffect(() => {
  fetch('/api/...').then(...)
}, []);
```

### Risk Assessment

- **Severity**: 🟡 IMPORTANT
- **Impact**: Performance degradation, poor SEO
- **Likelihood**: High

## Resolution

Converted the following pages to use Server Components with async data fetching:

1. **tournaments/page.tsx** - Fully converted to Server Component
   - Data fetched server-side via Prisma
   - No client-side loading state needed

2. **dashboard/page.tsx** - Hybrid approach
   - Server Component fetches initial tournament data
   - Client Component handles filter/sort interactivity
   - Passes server-fetched data as props to client component

3. **account/page.tsx** - Hybrid approach
   - Server Component fetches user profile, tournament history, and match history
   - Client Component handles interactive notification settings
   - Passes server-fetched data as props to client component

## Changes Made

- `apps/web/app/tournaments/page.tsx` - Converted to async Server Component
- `apps/web/app/dashboard/page.tsx` - Converted to Server Component with data fetching
- `apps/web/app/dashboard/DashboardClient.tsx` - New file with client-side interactivity
- `apps/web/app/account/page.tsx` - Converted to Server Component with data fetching
- `apps/web/app/account/AccountClient.tsx` - New file with client-side interactivity

## Benefits

- **Performance**: Data fetched on server, reducing client bundle size
- **SEO**: Server-rendered content is crawlable by search engines
- **User Experience**: Faster initial page loads, no loading spinners for initial data

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
| 2026-02-19 | Resolved | Converted all 3 pages to Server Components |

## Resources

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts)
