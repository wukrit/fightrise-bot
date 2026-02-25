# Architecture Research

**Domain:** Tournament Admin Web Portals in Next.js App Router
**Researched:** 2026-02-25
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Admin UI Layer (React)                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ Admin Pages     │  │ Dashboard      │  │ Registration    │    │
│  │ /admin/         │  │ Stats          │  │ Management      │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │
│           │                    │                    │              │
├───────────┴────────────────────┴────────────────────┴──────────────┤
│                  Admin API Routes (Next.js Route Handlers)         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Admin Service Layer                             │  │
│  │  - TournamentAdminService                                   │  │
│  │  - RegistrationService                                      │  │
│  │  - MatchAdminService                                        │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
├──────────────────────────────┴─────────────────────────────────────┤
│                    Shared Packages                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ Database    │  │ Shared       │  │ UI Components│            │
│  │ (Prisma)   │  │ (Types)      │  │ (Radix UI)   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Admin API Routes | HTTP endpoints for admin operations | Next.js Route Handlers in `app/api/tournaments/[id]/admin/*` |
| Admin Pages | Server-rendered admin UI pages | Next.js Pages in `app/tournaments/[id]/admin/*` |
| Admin Services | Business logic for admin operations | TypeScript modules in `lib/admin/` |
| TournamentAdmin Model | RBAC for tournament access | Prisma model with OWNER/ADMIN/MODERATOR roles |

## Recommended Project Structure

```
apps/web/
├── app/
│   ├── api/
│   │   └── tournaments/
│   │       └── [tournamentId]/
│   │           └── admin/
│   │               ├── route.ts              # GET /api/tournaments/:id/admin
│   │               ├── registrations/
│   │               │   ├── route.ts          # GET/POST /admin/registrations
│   │               │   └── [registrationId]/
│   │               │       ├── route.ts      # GET/PUT/DELETE single
│   │               │       ├── approve/route.ts
│   │               │       └── reject/route.ts
│   │               ├── matches/
│   │               │   ├── route.ts          # GET matches for admin
│   │               │   └── [matchId]/
│   │               │       ├── route.ts      # GET/PUT match
│   │               │       ├── dq/route.ts   # POST DQ player
│   │               │       └── dispute/route.ts
│   │               ├── seeding/
│   │               │   └── route.ts          # GET/POST seeding
│   │               └── settings/
│   │                   └── route.ts         # GET/PUT tournament settings
│   │
│   └── tournaments/
│       └── [tournamentId]/
│           └── admin/
│               ├── page.tsx                 # Admin dashboard
│               ├── registrations/
│               │   └── page.tsx            # Registration management
│               ├── matches/
│               │   └── page.tsx            # Match management
│               ├── seeding/
│               │   └── page.tsx            # Seeding editor
│               └── settings/
│                   └── page.tsx            # Tournament settings
│
├── lib/
│   ├── admin/
│   │   ├── tournament-admin.ts            # Admin check utilities
│   │   ├── services/
│   │   │   ├── registration-service.ts
│   │   │   ├── match-admin-service.ts
│   │   │   └── seeding-service.ts
│   │   └── actions/
│   │       ├── registration-actions.ts     # Server Actions
│   │       └── match-actions.ts
│   └── auth.ts                             # Existing - NextAuth config
│
└── components/
    └── admin/
        ├── RegistrationTable.tsx           # Shared admin components
        ├── MatchCard.tsx
        ├── SeedingEditor.tsx
        └── BulkActionBar.tsx
```

### Structure Rationale

- **`app/api/tournaments/[tournamentId]/admin/`:** Follows existing API route conventions in codebase. Nested admin routes mirror page structure.
- **`app/tournaments/[tournamentId]/admin/`:** Pages colocated with other tournament pages. Admin subfolder keeps admin-specific UI isolated.
- **`lib/admin/`:** Centralized admin business logic reusable across API routes, pages, and Server Actions.
- **`components/admin/`:** Reusable UI components shared between admin pages.
- **Server Actions:** Use for mutations (approve, reject, DQ) following Next.js best practices.

## Architectural Patterns

### Pattern 1: Admin Route Handler with RBAC

**What:** REST API endpoint that verifies tournament admin role before processing request.
**When:** All admin API routes.
**Trade-offs:** Consistent auth pattern but requires repeated check code.

**Example:**
```typescript
// apps/web/app/api/tournaments/[id]/admin/registrations/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: tournamentId } = await params;

  // 2. Check admin role (OWNER, ADMIN, or MODERATOR)
  const adminCheck = await prisma.tournamentAdmin.findFirst({
    where: {
      user: { discordId: session.user.discordId },
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
    },
  });

  if (!adminCheck) {
    return NextResponse.json(
      { error: 'Only tournament admins can view registrations' },
      { status: 403 }
    );
  }

  // 3. Process request
  const registrations = await prisma.registration.findMany({
    where: { tournamentId },
    include: { user: { select: { ... } } },
  });

  return NextResponse.json({ registrations });
}
```

### Pattern 2: Server Actions with Role Verification

**What:** Mutate data using Server Actions with explicit role checks.
**When:** Admin mutations (approve, reject, DQ, update seeding).
**Trade-offs:** Better UX with progressive enhancement, but requires client-side JavaScript for best experience.

**Example:**
```typescript
// apps/web/lib/admin/actions/registration-actions.ts
'use server'

import { prisma, AdminRole } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function verifyTournamentAdmin(tournamentId: string, minRole: AdminRole = AdminRole.MODERATOR) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    throw new Error('Unauthorized');
  }

  const admin = await prisma.tournamentAdmin.findFirst({
    where: {
      user: { discordId: session.user.discordId },
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
    },
  });

  if (!admin) {
    throw new Error('Only tournament admins can perform this action');
  }

  return true;
}

export async function approveRegistration(registrationId: string, tournamentId: string) {
  await verifyTournamentAdmin(tournamentId, AdminRole.MODERATOR);

  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: RegistrationStatus.CONFIRMED },
  });

  revalidatePath(`/tournaments/${tournamentId}/admin/registrations`);
}
```

### Pattern 3: Admin Page with Server Components

**What:** Server-rendered admin page that fetches data on the server.
**When:** Read-only admin pages (dashboard, view registrations).
**Trade-offs:** Fast initial load, SEO-friendly, but requires full page reload for data updates.

**Example:**
```typescript
// apps/web/app/tournaments/[id]/admin/registrations/page.tsx
import { prisma, AdminRole } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RegistrationTable } from '@/components/admin/RegistrationTable';

export default async function AdminRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    redirect('/auth/signin');
  }

  const { id: tournamentId } = await params;

  // Verify admin
  const admin = await prisma.tournamentAdmin.findFirst({
    where: {
      user: { discordId: session.user.discordId },
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
    },
  });

  if (!admin) {
    redirect(`/tournaments/${tournamentId}`);
  }

  // Fetch data
  const registrations = await prisma.registration.findMany({
    where: { tournamentId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  return <RegistrationTable registrations={registrations} tournamentId={tournamentId} />;
}
```

### Pattern 4: Admin Check Utility

**What:** Reusable function to verify admin permissions.
**When:** Multiple admin routes/actions need consistent checking.
**Trade-offs:** DRY but adds indirection.

**Example:**
```typescript
// apps/web/lib/admin/tournament-admin.ts
import { prisma, AdminRole } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type AdminPermission = 'view' | 'manage_registrations' | 'manage_matches' | 'manage_seeding' | 'manage_settings';

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.OWNER]: ['view', 'manage_registrations', 'manage_matches', 'manage_seeding', 'manage_settings'],
  [AdminRole.ADMIN]: ['view', 'manage_registrations', 'manage_matches', 'manage_seeding', 'manage_settings'],
  [AdminRole.MODERATOR]: ['view', 'manage_registrations', 'manage_matches'],
};

export async function verifyTournamentAdmin(
  tournamentId: string,
  requiredPermission: AdminPermission = 'view'
): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return false;
  }

  const admin = await prisma.tournamentAdmin.findFirst({
    where: {
      user: { discordId: session.user.discordId },
      tournamentId,
    },
  });

  if (!admin) {
    return false;
  }

  const permissions = rolePermissions[admin.role] || [];
  return permissions.includes(requiredPermission);
}
```

## Data Flow

### Request Flow: Admin API

```
[Admin UI Component]
    ↓ fetch()
[Admin API Route: /api/tournaments/:id/admin/registrations]
    ↓
[Auth Check: Session + TournamentAdmin]
    ↓
[Admin Service Layer]
    ↓
[Prisma ORM]
    ↓
[PostgreSQL Database]
    ↓
[Response → JSON]
    ↓
[Admin UI Updates (use or revalidatePath)]
```

### Request Flow: Server Action

```
[Admin UI Form]
    ↓ submit()
[Server Action: approveRegistration()]
    ↓
[verifyTournamentAdmin() - checks session + role]
    ↓
[Prisma Transaction]
    ↓
[revalidatePath() - purge cache]
    ↓
[UI Automatically Refetches]
```

### State Management

```
[Server Component]
    ↓ (fetches data)
[React Component Props]
    ↓ (renders)
[UI State (useState/useReducer for local interactions)]
    ↓ (user actions)
[Server Actions or API Calls]
    ↓ (mutate data)
[revalidatePath() or router.refresh()]
    ↓ (refetch)
[Server Component Re-renders]
```

### Key Data Flows

1. **Admin Dashboard Load:** Server Component fetches tournament + registrations + matches in parallel, renders page.
2. **Registration Approval:** User clicks approve → Server Action validates admin → Updates DB → revalidatePath → UI updates.
3. **Bulk Actions:** Select multiple → Submit bulk action → Server Action processes array → revalidatePath.
4. **Real-time-ish Updates:** After mutations, use `revalidatePath()` to refresh server components.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|-------------------------|
| 0-1K users | Single Next.js instance, Prisma with basic queries fine |
| 1K-100K users | Add database indexing on tournamentId, consider read replicas |
| 100K+ users | Consider separate admin API endpoints, caching with Redis |

### Scaling Priorities

1. **First bottleneck:** Database queries on registrations table with no indexes. Fix: Add composite index on (tournamentId, status).
2. **Second bottleneck:** Admin page load times with large tournaments. Fix: Implement pagination, limit fields returned.

## Anti-Patterns

### Anti-Pattern 1: Client-Side Admin Checks Only

**What people do:** Check admin role only in React components, not on server.
**Why it's wrong:** Any user can bypass UI and call API directly.
**Do this instead:** Always verify admin role in API route handler AND Server Action.

### Anti-Pattern 2: Direct Prisma Access in Components

**What people do:** Import prisma directly in page components for queries.
**Why it's wrong:** Mixing data fetching with UI code, harder to test, duplicates logic.
**Do this instead:** Use service layer in `lib/admin/services/`, import in components.

### Anti-Pattern 3: Mixing Admin and User Routes

**What people do:** Put admin endpoints in same routes as user endpoints.
**Why it's wrong:** Authorization bugs, harder to secure, confusing structure.
**Do this instead:** Use explicit `/admin/` prefix in routes and pages.

### Anti-Pattern 4: Not Using Transactions

**What people do:** Multiple sequential Prisma calls without transactions.
**Why it's wrong:** Partial failures leave inconsistent state (e.g., approve registration but fail to notify).
**Do this instead:** Use `prisma.$transaction()` for multi-step operations.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Discord API | Webhook for admin notifications | Bot already handles Discord |
| Start.gg API | GraphQL mutations for seeding updates | Use existing startgg-client package |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Admin API ↔ Bot | Database + Event | Both write to same Prisma models |
| Admin Pages ↔ API | HTTP + Server Actions | Use fetch() or Server Actions |
| Web ↔ Database | Prisma | Shared via @fightrise/database package |

## Build Order

### Phase 1: Foundation (Week 1)

1. **Admin Service Layer** (`lib/admin/`)
   - `tournament-admin.ts` - Admin verification utility
   - Service modules for registrations, matches, seeding

2. **Admin API Routes** (first batch)
   - `GET /api/tournaments/[id]/admin` - Dashboard data
   - `GET /api/tournaments/[id]/admin/registrations` - List registrations (existing partial)

**Dependencies:** None - builds on existing auth and Prisma

### Phase 2: Registration Management (Week 2)

1. **Registration API** - Full CRUD
   - PUT `/api/tournaments/[id]/admin/registrations/[regId]`
   - POST `/api/tournaments/[id]/admin/registrations/bulk-approve`
   - POST `/api/tournaments/[id]/admin/registrations/bulk-reject`

2. **Registration Server Actions**
   - `approveRegistration()`
   - `rejectRegistration()`
   - `bulkApproveRegistrations()`

3. **Registration Admin Page**
   - Update existing mock page to use real data
   - Add Server Action integration

**Dependencies:** Phase 1 foundation

### Phase 3: Match Management (Week 3)

1. **Match Admin API**
   - GET `/api/tournaments/[id]/admin/matches` - List all matches
   - PUT `/api/tournaments/[id]/admin/matches/[matchId]` - Update match

2. **Match Admin Server Actions**
   - `dqPlayer()`
   - `resolveDispute()`

3. **Match Admin Page**
   - List matches with filters
   - DQ modal

**Dependencies:** Phase 1 + Registration management

### Phase 4: Seeding & Settings (Week 4)

1. **Seeding API**
   - GET/POST `/api/tournaments/[id]/admin/seeding`

2. **Settings API**
   - GET/PUT `/api/tournaments/[id]/admin/settings`

3. **Seeding Editor UI**
   - Drag-and-drop seeding interface

**Dependencies:** All previous phases

## Sources

- [Next.js App Router Documentation](https://nextjs.org/docs/app) - Route handlers, Server Actions
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication) - Authorization patterns
- [Next.js Data Security](https://nextjs.org/docs/app/building-your-application/data-security) - Server Actions security
- Context7 library: `/vercel/next.js` - Version-aware documentation

---

*Architecture research for: Tournament Admin Web Portals*
*Researched: 2026-02-25*
