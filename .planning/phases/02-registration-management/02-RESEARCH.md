# Phase 2: Registration Management - Research

**Researched:** 2026-02-25
**Domain:** Tournament Registration Admin API & UI
**Confidence:** HIGH

## Summary

Phase 2 focuses on building admin registration management capabilities. The database schema already supports this with the Registration model and AuditLog model having appropriate fields and enums. The API needs additional endpoints beyond the existing GET (pagination, filtering, create, update, delete). The UI needs a registrations admin page with table, filters, and action modals.

**Primary recommendation:** Extend existing admin route with POST/PATCH/DELETE methods, create admin registrations page with table using existing UI components (Table, Button, Modal, Select), integrate audit logging on all mutations.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Table with columns: player, status, source, createdAt
- Filters: All, Pending, Confirmed, Cancelled
- Pagination: 20 per page
- Approve: Single click, sets status to CONFIRMED
- Reject: Requires reason input, sets status to CANCELLED
- Manual Add: Search by Discord username, form for details
- Remove: Confirmation dialog, hard delete

### Claude's Discretion
- No specific references — open to standard admin table patterns.

### Deferred Ideas (OUT OF SCOPE)
- Bulk operations (Phase 3+)
- CSV export (Phase 3+)

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| API-02 | POST /api/tournaments/[id]/admin/registrations - Create manual registration | Prisma Registration.create with MANUAL source |
| API-03 | PATCH /api/tournaments/[id]/admin/registrations/[id] - Update registration status | Prisma Registration.update for approve/reject |
| API-04 | DELETE /api/tournaments/[id]/admin/registrations/[id] - Remove registration | Prisma Registration.delete with audit logging |
| API-07 | GET /api/tournaments/[id]/admin/audit - List audit logs | Prisma AuditLog.findMany with filters |
| DASH-03 | Dashboard shows recent admin actions | Already exists on admin dashboard page |
| REG-01 | Admin can view all registrations in a table with status filters | Need UI page + API filtering |
| REG-02 | Admin can approve pending registrations | Need PATCH endpoint + UI action |
| REG-03 | Admin can reject registrations with reason | Need PATCH endpoint with reason + UI modal |
| REG-04 | Admin can manually register a player (walk-in) | Need POST endpoint + UI form |
| REG-05 | Admin can remove a registration | Need DELETE endpoint + UI confirmation |
| REG-06 | Registration table supports pagination | Need API pagination (20 per page per context) |
| AUDIT-01 | Admin can view audit log for tournament | Need audit log page or section |
| AUDIT-02 | Audit log shows action, user, timestamp, details | Already implemented in AuditLog model |
| AUDIT-03 | Audit log supports filtering by action type | Need API filtering + UI filter |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 14 | ^14.x | App Router API routes | Project uses Next.js App Router |
| Prisma | ^6.x | Database ORM | Already in project |
| Radix UI | latest | UI primitives | Already in project (packages/ui) |

### Supporting (Already in Project)
| Library | Purpose | Location |
|---------|---------|----------|
| @fightrise/database | Prisma client, enums | packages/database |
| @fightrise/ui | Table, Button, Modal, Select, Badge | packages/ui |
| next-auth | Authentication | apps/web/lib/auth.ts |

### Not Needed
- No additional UI library needed - Radix + existing components sufficient
- No validation library needed - Zod already in project (per CLAUDE.md mentions Zod schemas)

---

## Architecture Patterns

### API Route Structure
```
app/api/tournaments/[id]/admin/
├── registrations/
│   ├── route.ts          # GET (exists), POST (new)
│   └── [registrationId]/
│       └── route.ts      # PATCH, DELETE
└── audit/
    └── route.ts          # GET audit logs
```

### Page Structure
```
app/tournaments/[id]/admin/
├── page.tsx              # Dashboard (exists)
├── registrations/
│   └── page.tsx         # NEW: Registrations table
└── audit/
    └── page.tsx         # NEW: Audit log viewer
```

### Pattern 1: Admin API Endpoint with Authorization
**What:** Standard pattern for admin endpoints in this project
**When to use:** All admin API routes
**Example:**
```typescript
// Source: apps/web/app/api/tournaments/[id]/admin/registrations/route.ts
export async function GET(request: NextRequest, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin check
  const adminCheck = await prisma.tournamentAdmin.findFirst({
    where: {
      userId: user.id,
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
    },
  });

  if (!adminCheck) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... handler
}
```

### Pattern 2: Audit Logging in Mutations
**What:** Log admin actions to AuditLog
**When to use:** All registration mutations (create, approve, reject, delete)
**Example:**
```typescript
await prisma.$transaction(async (tx) => {
  // Update registration
  const registration = await tx.registration.update({
    where: { id: registrationId },
    data: { status: RegistrationStatus.CONFIRMED },
  });

  // Create audit log
  await tx.auditLog.create({
    data: {
      action: AuditAction.REGISTRATION_APPROVED,
      entityType: 'Registration',
      entityId: registrationId,
      userId: adminUser.id,
      after: registration,
    },
  });

  return registration;
});
```

### Pattern 3: UI Table with Server Actions
**What:** Use Server Components for data fetching, client components for interactivity
**When to use:** Registration table page
**Example:**
```typescript
// Server Component: page.tsx
async function RegistrationsPage({ params }) {
  const data = await getRegistrations(tournamentId, searchParams);
  return <RegistrationsTable initialData={data} />;
}

// Client Component: RegistrationsTable.tsx
'use client';
export function RegistrationsTable({ initialData }) {
  const [data, setData] = useState(initialData);
  // Filter, pagination, actions...
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table UI | Custom table | @fightrise/ui Table | Already exists in project |
| Modal dialog | Custom modal | @fightrise/ui Modal (Radix Dialog) | Already exists, accessible |
| Dropdown select | Custom select | @fightrise/ui Select (Radix Select) | Already exists, accessible |
| Status badges | Custom styling | @fightrise/ui Badge | Already exists |
| Form validation | Custom validation | Zod (per CLAUDE.md) | Already in project |
| Date formatting | Custom formatting | date-fns or Intl.DateTimeFormat | Standard approach |

---

## Common Pitfalls

### Pitfall 1: Missing Authorization on API Routes
**What goes wrong:** API endpoints accessible without admin role check
**Why it happens:** Forgetting to add admin check after session validation
**How to avoid:** Always include `requireTournamentAdminById` or equivalent check
**Warning signs:** Endpoints return 200 without admin verification

### Pitfall 2: Not Using Transactions for Mutate + Audit
**What goes wrong:** Registration updates without audit log creation
**Why it happens:** Separate queries not atomic
**How to avoid:** Use `prisma.$transaction` for all mutation + audit pairs
**Warning signs:** Audit logs missing for some actions under concurrent load

### Pitfall 3: Pagination Without Cursor or Offset
**What goes wrong:** Inconsistent pagination, performance issues with large datasets
**Why it happens:** Loading all records and slicing in memory
**How to avoid:** Use Prisma's `skip`/`take` with URL search params for offset pagination (20 per page per context)
**Warning signs:** Memory issues with large tournaments

### Pitfall 4: Not Filtering Audit Logs by Tournament
**What goes wrong:** Audit logs show actions from all tournaments
**Why it happens:** Query missing tournamentId filter
**How to avoid:** Include tournamentId in AuditLog queries (via entity relation)
**Warning signs:** Audit log page shows unrelated entries

---

## Code Examples

### Registration Table with Filters (UI)
```tsx
// Source: Based on existing patterns in apps/web/app/tournaments/[id]/admin/page.tsx
// and @fightrise/ui Table component

'use client';

import { useState } from 'react';
import { Table, Button, Badge, Modal, Select } from '@fightrise/ui';

export function RegistrationsTable({ initialRegistrations }) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const [registrations, setRegistrations] = useState(initialRegistrations);

  const filtered = filter === 'ALL'
    ? registrations
    : registrations.filter(r => r.status === filter);

  const statusColors = {
    PENDING: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'destructive',
  };

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>Player</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head>Source</Table.Head>
            <Table.Head>Created</Table.Head>
            <Table.Head>Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {filtered.map(reg => (
            <Table.Row key={reg.id}>
              <Table.Cell>{reg.user?.discordUsername || reg.displayName}</Table.Cell>
              <Table.Cell>
                <Badge variant={statusColors[reg.status]}>{reg.status}</Badge>
              </Table.Cell>
              <Table.Cell>{reg.source}</Table.Cell>
              <Table.Cell>{new Date(reg.createdAt).toLocaleDateString()}</Table.Cell>
              <Table.Cell>
                {/* Actions: Approve, Reject, Remove */}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
```

### Audit Log Query with Filtering (API)
```typescript
// Source: Based on existing admin registrations route pattern

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const actionFilter = searchParams.get('action'); // e.g., 'REGISTRATION_APPROVED'
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  const where: Prisma.AuditLogWhereInput = {
    // Filter by registration-related actions
    action: actionFilter ? { in: [
      'REGISTRATION_APPROVED',
      'REGISTRATION_REJECTED',
      'REGISTRATION_MANUAL_ADD',
      'REGISTRATION_MANUAL_REMOVE'
    ]} : undefined,
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { discordUsername: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side filtering | Server-side filtering with URL params | Next.js App Router | Better SEO, shareable URLs |
| REST pagination | Offset-based with searchParams | Standard | Simple, works with table UIs |
| Direct Prisma in components | Server Components + Prisma | Next.js 14 | Better data fetching |

**Deprecated/outdated:**
- None relevant - current patterns are modern and appropriate

---

## Open Questions

1. **How to handle event-scoped registrations?**
   - What we know: Registration model has optional eventId, tournament can have multiple events
   - What's unclear: Should admin filter by event?
   - Recommendation: Start with tournament-level (all events), add event filter if Phase 3 requires

2. **Manual registration user search?**
   - What we know: Need to search by Discord username
   - What's unclear: How to search - autocomplete or dropdown?
   - Recommendation: Use existing Discord user lookup, simple text search

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | vitest.config.ts (root), playwright.config.ts (apps/web) |
| Quick run command | `npm run docker:test` |
| Full suite command | `npm run docker:test && npm run docker:test:integration` |
| Estimated runtime | ~60-90 seconds for full suite |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| API-02 | Create manual registration | integration | `npm run docker:test:integration` | No - needs test |
| API-03 | Update registration status | integration | `npm run docker:test:integration` | No - needs test |
| API-04 | Delete registration | integration | `npm run docker:test:integration` | No - needs test |
| API-07 | List audit logs | integration | `npm run docker:test:integration` | No - needs test |
| REG-01 | View registrations table | e2e | `npm run docker:test:e2e` | No - needs test |
| REG-02 | Approve registration | integration | `npm run docker:test:integration` | No - needs test |
| REG-03 | Reject with reason | integration | `npm run docker:test:integration` | No - needs test |
| REG-04 | Manual add player | integration | `npm run docker:test:integration` | No - needs test |
| REG-05 | Remove registration | integration | `npm run docker:test:integration` | No - needs test |
| REG-06 | Pagination | integration | `npm run docker:test:integration` | No - needs test |
| AUDIT-01 | View audit log | e2e | `npm run docker:test:e2e` | No - needs test |
| AUDIT-03 | Filter audit logs | integration | `npm run docker:test:integration` | No - needs test |

### Nyquist Sampling Rate
- **Minimum sample interval:** After every committed task -> run: `npm run docker:test`
- **Full suite trigger:** Before merging final task of any plan wave
- **Phase-complete gate:** Full suite green before `/gsd:verify-work` runs
- **Estimated feedback latency per task:** ~30-60 seconds

### Wave 0 Gaps (must be created before implementation)
- Integration tests for admin registration endpoints do not exist yet
- E2E tests for admin registration page do not exist yet
- Test fixtures for Registration and AuditLog models needed

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: apps/web/app/api/tournaments/[id]/admin/registrations/route.ts - API patterns
- Existing codebase: apps/web/app/tournaments/[id]/admin/page.tsx - Admin dashboard patterns
- Existing codebase: packages/database/prisma/schema.prisma - Data models
- Existing codebase: packages/ui/src/*.tsx - UI components

### Secondary (MEDIUM confidence)
- Next.js 14 App Router documentation - API route patterns
- Prisma documentation - Transaction and pagination patterns

### Tertiary (LOW confidence)
- None required - sufficient primary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing project libraries and patterns
- Architecture: HIGH - Follows existing Next.js App Router patterns
- Pitfalls: HIGH - Based on existing code review and common patterns

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days - stable domain)
