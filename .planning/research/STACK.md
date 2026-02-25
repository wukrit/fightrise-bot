# Stack Research

**Domain:** Admin REST APIs in Next.js with Authentication and Role-Based Access
**Researched:** 2026-02-25
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|----------------|
| Next.js 14 | 14.x | API routes / Route Handlers | Already in use; supports App Router with modern Request/Response APIs |
| NextAuth.js | 4.24 | Authentication | Already in use; Discord OAuth provider configured; supports JWT sessions |
| Prisma | 5.7 | Database ORM | Already in use; integrates with existing schema |
| Zod | 4.x | Request validation | Already in use; TypeScript-first schema validation |
| Redis (via ioredis) | 5.3 | Rate limiting | Already in use for BullMQ; reuse for API rate limiting |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-* | 1.1.x | Admin UI components | Already in use; Modal, Select, Dialog, Table for admin pages |
| @tanstack/react-query | 5.x | Client-side data fetching | Admin dashboard with real-time updates |
| react-hook-form | 7.x | Form handling | Admin forms with complex validation |
| @hookform/resolvers | 3.x | Zod + react-hook-form | Type-safe form validation |

### Authentication & Authorization Pattern

The project already has:
- Discord OAuth via NextAuth.js
- JWT sessions with 30-day maxAge
- API key authentication (`validateApiKey()`)
- Tournament-specific admin roles via `TournamentAdmin` Prisma model

**Recommendation:** Extend the existing pattern for RBAC:

```typescript
// 1. Add role to session (already partially done via TournamentAdmin)
// In auth.ts callbacks - expose admin status per tournament
// 2. Use middleware for route protection
// 3. Use per-route checks for granular permissions

// Recommended: Create reusable auth helpers
// apps/web/lib/auth-admin.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, AdminRole } from '@fightrise/database';

export async function requireTournamentAdmin(tournamentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId }
  });

  if (!user) throw new Error('User not found');

  const admin = await prisma.tournamentAdmin.findFirst({
    where: {
      userId: user.id,
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] }
    }
  });

  if (!admin) throw new Error('Forbidden');
  return user;
}
```

### API Route Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| Route Handlers | External API consumers, REST endpoints | `/api/admin/tournaments/[id]/...` |
| Server Actions | Internal mutations from React components | Form submissions in admin UI |

**Recommendation:** Use Route Handlers for admin APIs because:
- Already established pattern in codebase
- More explicit about HTTP methods
- Better for external API consumers (third-party integrations)
- Same-origin only by default (security benefit)

### Validation Strategy

Use Zod with react-hook-form for consistency:

```typescript
// schemas/admin.ts
import { z } from 'zod';

export const updateRegistrationSchema = z.object({
  registrationId: z.string().uuid(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'DQ']),
  notes: z.string().optional(),
});
```

### Rate Limiting

The project already has Redis-based rate limiting in `apps/web/lib/ratelimit.ts`. Extend with admin-specific configs:

```typescript
export const RATE_LIMIT_CONFIGS = {
  // ... existing configs
  admin: { limit: 20, windowMs: 60000 },  // Already exists
  adminWrite: { limit: 10, windowMs: 60000 },  // For mutations
} as const;
```

### Admin UI Components

Leverage existing UI package (`packages/ui/src/`):

| Existing Component | Admin Use Case |
|-------------------|----------------|
| Table | Registration lists, match lists |
| Modal | Confirmations, edit forms |
| Select | Status dropdowns, role selection |
| Button | Actions |
| Input/Textarea | Search, notes |
| Badge | Status indicators |
| Card | Dashboard widgets |

### Error Handling

Reuse existing utilities in `apps/web/lib/api-response.ts`:
- `createErrorResponse()` for standardized errors
- `createSuccessResponse()` for responses
- `createRateLimitResponse()` for rate limits

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|------------------------|
| Route Handlers | Server Actions | When mutation is only called from server components |
| NextAuth session + DB checks | Full RBAC library (e.g., AccessControl) | When you need organization-level roles globally |
| Custom rate limiting | Upstash rate limiter | If you want managed rate limiting service |
| react-hook-form + Zod | tRPC | When you want end-to-end type safety (larger change) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| pages/api routes | Deprecated pattern | Route Handlers (app/api/*/route.ts) |
| Express.js standalone | Extra overhead, not needed | Next.js Route Handlers |
| Passport.js | Unmaintained, complex | NextAuth.js (already in use) |
| RBAC libraries with DB adapters | Overkill for tournament-specific roles | Custom tournament admin checks |
| Client-side only auth | Security risk | Server-side session checks |

## Installation

```bash
# Core - already installed
npm list next next-auth @prisma/client zod

# Additional for admin features
npm install @tanstack/react-query@5
npm install react-hook-form@7 @hookform/resolvers@3
npm install @radix-ui/react-table@1.1
npm install @radix-ui/react-dropdown-menu@1.1  # For admin context menus
npm install @radix-ui/react-tabs@1.1          # For admin page sections

# Dev
npm install -D @types/jsonwebtoken
```

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next-auth 4.24 | next 14.x | Current setup |
| @prisma/client 5.7 | prisma 5.7 | Must match |
| react-hook-form 7 | zod 3.x/4.x | Use @hookform/resolvers |
| @tanstack/react-query 5 | next 14.x | Server Components compatible |

## Sources

- Context7: /nextauthjs/next-auth - RBAC patterns, session callbacks
- Context7: /colinhacks/zod - Schema validation, version 4.x available
- Context7: /vercel/next.js - Route Handlers vs Server Actions
- Existing codebase: apps/web/lib/auth.ts - Current auth implementation
- Existing codebase: apps/web/lib/ratelimit.ts - Rate limiting patterns
- Existing codebase: apps/web/lib/api-response.ts - Error handling patterns

---

*Stack research for: Admin REST APIs in Next.js*
*Researched: 2026-02-25*
