---
title: "PR #117 Code Review Fixes"
category: "logic-errors"
date: 2026-03-12
tags: [code-review, frontend, security, react, typescript, docker]
related_issues: [117]
---

# PR #117 Code Review Fixes

This document captures all code review issues found and fixed in PR #117 - "feat: use shared UI components and replace inline styles with Tailwind".

## Problem Summary

Multiple P1, P2, and P3 issues were identified during code review of the PR, covering:
- React component issues (shadowing, cleanup)
- API security issues (validation, authorization)
- TypeScript type safety
- Docker build configuration

## Solutions

### 1. Shadowed Select Component (P1)

**Problem:** Local `Select` component in `tournaments/[id]/page.tsx` was shadowing the imported Radix-based Select from `@fightrise/ui`.

**Root Cause:** Local component definition with the same name as imported component.

**Fix:** Removed local Select and used imported Radix-based Select:

```typescript
// Now using the imported Radix-based Select
import { StatusBadge, Toggle, Input, Select } from '@fightrise/ui';
```

---

### 2. Missing AbortController in useEffect (P1)

**Problem:** Fetch calls in `tournaments/[id]/page.tsx` did not use AbortController, causing potential memory leaks.

**Fix:** Added AbortController to fetch effects:

```typescript
useEffect(() => {
  const controller = new AbortController();

  async function fetchDiscordData() {
    try {
      const response = await fetch('/api/discord/guilds', { signal: controller.signal });
      // ... rest of fetch logic
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch:', err);
      }
    }
  }

  fetchDiscordData();
  return () => controller.abort();
}, []);
```

---

### 3. setTimeout Without Cleanup (P1)

**Problem:** Success message auto-clear used uncontrolled `setTimeout`.

**Fix:** Converted to useEffect with clearTimeout:

```typescript
useEffect(() => {
  if (!saveSuccess) return;

  const timer = setTimeout(() => setSaveSuccess(false), 3000);
  return () => clearTimeout(timer);
}, [saveSuccess]);
```

---

### 4. Missing Input Validation on PUT Endpoint (P1)

**Problem:** `/api/tournaments/[id]` PUT endpoint accepted any input without validation.

**Fix:** Added Zod validation using existing schema:

```typescript
import { PartialTournamentConfigSchema } from '@fightrise/shared';

const validationResult = PartialTournamentConfigSchema.safeParse(body);
if (!validationResult.success) {
  return createErrorResponse(
    'Invalid input',
    HttpStatus.BAD_REQUEST,
    { details: validationResult.error.flatten().fieldErrors }
  );
}
```

---

### 5. Missing Authorization on GET Endpoint (P1)

**Problem:** GET endpoint allowed any authenticated user to access any tournament.

**Fix:** Added admin/participant authorization check:

```typescript
const [isAdmin, isParticipant] = await Promise.all([
  prisma.tournamentAdmin.findFirst({
    where: { tournamentId: id, user: { discordId: session.user.discordId } },
  }),
  prisma.registration.findFirst({
    where: { tournamentId: id, user: { discordId: session.user.discondId } },
  }),
]);

if (!isAdmin && !isParticipant) {
  return createErrorResponse('Forbidden', HttpStatus.FORBIDDEN);
}
```

---

### 6. TypeScript any Types (P2)

**Problem:** Discord guild/channel data used `any` types.

**Fix:** Added proper interfaces:

```typescript
interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}
```

---

### 7. Placeholder console.log Handlers (P2)

**Problem:** Account page had placeholder console.log statements.

**Fix:** Removed placeholder handlers from `AccountClient.tsx`.

---

### 8. Unused Code in StatCard (P2)

**Problem:** Unused `trendBgColors` array in StatCard component.

**Fix:** Removed unused code from `packages/ui/src/StatCard.tsx`.

---

### 9. Missing Keyboard Accessibility on Toggle (P3)

**Problem:** Toggle component only responded to clicks, not keyboard.

**Fix:** Added onKeyDown handler:

```typescript
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onChange?.(!checked);
  }
}}
```

---

### 10. Docker Build - Missing Standalone Output (Build)

**Problem:** Next.js production build failed in Docker.

**Fix:** Added `output: 'standalone'` to `next.config.js`:

```javascript
const nextConfig = {
  output: 'standalone',
  // ... rest of config
};
```

---

### 11. package-lock.json Issues (Build)

**Problem:** npm ci failed in Docker.

**Fix:** Regenerated `package-lock.json` with `npm install`.

---

## Prevention Strategies

### React/Frontend Issues
- Enable `no-shadow` ESLint rule
- Use standard useEffect patterns with cleanup functions
- Enable `eslint-plugin-react-hooks`
- Test components with keyboard only

### API Security
- Always validate input with Zod schemas
- Verify user relationship to resource (not just authentication)
- Enable rate limiting on all endpoints

### TypeScript
- Enable `@typescript-eslint/no-explicit-any`
- Use explicit interfaces for API responses
- Run `tsc --noUnusedLocals` before commits

### Docker Builds
- Test builds in CI before merging
- Use multi-stage builds
- Ensure proper .dockerignore
- Commit lockfiles

---

## Related Documentation

- [E2E Playwright Next.js API Mocking](../test-failures/e2e-playwright-nextjs-api-mocking.md) - Test setup for PR verification
- [Ralph Loop Security Session](../security-issues/ralph-loop-session-feb-2026-security.md) - Input validation patterns

---

## Files Changed

| Issue | File(s) |
|-------|---------|
| Shadowed Select | `tournaments/[id]/page.tsx`, `packages/ui/src/Select.tsx` |
| AbortController | `tournaments/[id]/page.tsx` |
| setTimeout cleanup | `tournaments/[id]/page.tsx` |
| Input validation | `api/tournaments/[id]/route.ts` |
| Authorization | `api/tournaments/[id]/route.ts` |
| Type safety | `tournaments/[id]/page.tsx` |
| Console.log | `AccountClient.tsx` |
| Unused code | `StatCard.tsx` |
| Keyboard a11y | `packages/ui/src/Toggle.tsx` |
| Docker config | `next.config.js` |
| Lockfile | `package-lock.json` |
