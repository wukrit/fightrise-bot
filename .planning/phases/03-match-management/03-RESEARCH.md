# Phase 3: Match Management - Research

**Researched:** 2026-02-25
**Domain:** Next.js admin dashboard, Prisma database operations, Radix UI components
**Confidence:** HIGH

## Summary

Phase 3 implements the Match Management admin interface for viewing matches, viewing match details (including check-in status), and disqualifying players. The project already has the database schema (Match, MatchPlayer, GameResult models), a DQ service in the bot (with TODOs for Start.gg sync), and established UI patterns from Phase 2. Key technical work includes creating the matches API endpoint, building the matches list page with expandable rows, and implementing the DQ flow with Start.gg sync.

**Primary recommendation:** Build the matches API endpoint first, then the UI page following the registrations page pattern. The DQ flow requires adding a Start.gg mutation (currently only reportSet exists).

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Match List UI:** Expandable rows (click to expand inline details), not separate detail page
- **Filters:** Search by player name + dropdowns for round and state
- **Columns:** Full columns (Round, Player 1, Player 2, Score, Status, Actions)
- **DQ Action:** In expanded view only (not in collapsed row actions)
- **Pagination:** 50 matches per page
- **Empty State:** Helpful message about tournament state
- **Sort Order:** By round number (default)
- **Auto-refresh:** Enabled (every 30 seconds)
- **Status Display:** Color-coded badges (green=complete, yellow=in progress, red=disputed)
- **Round Labels:** Include bracket type (e.g., "Winners R1", "Losers R3")
- **Mobile:** Card view on small screens

- **Match Detail View:** Full details (players, scores, round, state, check-in status, timestamps)
- **Score Format:** Game scores (e.g., "2-1")
- **Player Names:** Both Discord username and Start.gg name
- **Check-in Info:** Detailed (who checked in, timestamp, timeout status)
- **Timestamps:** Relative ("5 min ago") not absolute
- **Disputed Matches:** Show link to dispute details
- **DQ Button:** In expanded details section

- **DQ Flow:** Two-step (click player row, then confirm DQ)
- **Reason:** Optional (not required)
- **Confirmation:** Show "Are you sure?" dialog before DQ
- **Feedback:** Status toast ("Player disqualified, syncing to Start.gg...")
- **Error Handling:** Show error, keep dialog open with retry option
- **Audit Log:** Full details (admin, timestamp, player, reason, match)

- **Check-in Display:** Color + icon (green check, red X, yellow clock)
- **Timeout:** Show time they timed out at
- **Summary:** Show count per match ("1/2 checked in")
- **Warning:** Highlight near-deadline matches in yellow

### Claude's Discretion

No specific discretion areas - all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Real-time updates via WebSocket — later phase
- Match reseeding UI — later phase

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| API-06 | POST /api/tournaments/[id]/admin/players/[id]/dq - Disqualify player | Existing dqService.ts in bot with database transaction pattern |
| MATCH-01 | Admin can view all matches in a table with filters (round, state) | Prisma Match model with state/roundText fields, existing registrations pattern |
| MATCH-02 | Admin can view match details (players, scores) | Prisma MatchPlayer and GameResult models, expandable row UI pattern |
| MATCH-03 | Admin can view check-in status for matches | MatchPlayer has isCheckedIn, checkedInAt fields |
| DQ-01 | Admin can disqualify a player from a match | Existing dqService.ts handles this |
| DQ-02 | DQ form requires reason input | UI implementation, reason is optional per decisions |
| DQ-03 | DQ action creates audit log entry | dqService.ts creates audit log with PLAYER_DQ action |
| DQ-04 | DQ syncs to Start.gg via API | TODO exists in dqService.ts, needs Start.gg mutation |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 14 | Latest (App Router) | Web framework | Already in use |
| Prisma | Latest | Database ORM | Already in use |
| Radix UI | Latest | UI primitives | Already in use (Modal, Dialog) |
| @fightrise/database | * | Database client, enums | Internal package |
| @fightrise/ui | * | Shared UI components | Internal package |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | Latest | Modal/dialog for confirmations | DQ confirmation dialog |
| @radix-ui/react-select | Latest | Dropdown filters | Round/state filters |
| @radix-ui/react-tooltip | Latest | Hover info | Check-in icons |
| date-fns | Latest | Relative time formatting | "5 min ago" timestamps |

**Installation:**
No new packages required - all needed packages already in use.

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/app/tournaments/[id]/admin/
├── matches/
│   └── page.tsx              # Server Component - matches list page
├── components/
│   ├── ClientMatchesTable.tsx  # Client Component - table with expandable rows
│   ├── MatchesTable.tsx       # Presentational component - table UI
│   ├── MatchDetail.tsx         # Expanded row content
│   ├── DQModal.tsx             # DQ confirmation dialog
│   └── MatchFilters.tsx       # Filter controls
app/api/tournaments/[id]/admin/
├── matches/
│   └── route.ts               # GET matches list with filters
├── players/
│   └── [playerId]/
│       └── dq/
│           └── route.ts       # POST DQ player
```

### Pattern 1: Server Component with Client Table
**What:** Server Component fetches initial data, Client Component handles interactivity
**When to use:** Match list with filters, pagination, expandable rows
**Example:**
```typescript
// apps/web/app/tournaments/[id]/admin/matches/page.tsx
import { ClientMatchesTable } from '@/components/admin/ClientMatchesTable';

async function getMatches(tournamentId: string, filters) {
  return await prisma.match.findMany({ /* ... */ });
}

export default async function MatchesPage({ params, searchParams }) {
  const data = await getMatches(tournamentId, filters);
  return <ClientMatchesTable initialData={data} tournamentId={tournamentId} />;
}
```

### Pattern 2: API Route with Authorization
**What:** REST API endpoint with requireTournamentAdmin, rate limiting
**When to use:** Admin API endpoints
**Example:**
```typescript
// From existing registrations route
export async function GET(request: NextRequest, { params }) {
  const authResult = await requireTournamentAdmin(request, tournamentId);
  if (authResult instanceof NextResponse) return authResult;
  // ... handler
}
```

### Pattern 3: Database Transaction for DQ
**What:** Use prisma.$transaction for atomic DQ with audit log
**When to use:** Disqualifying a player
**Example:**
```typescript
// From existing dqService.ts
await prisma.$transaction(async (tx) => {
  await tx.match.updateMany({ where: { id, state: { notIn: [COMPLETED, DQ] } }, data: { state: DQ } });
  await tx.matchPlayer.update({ where: { id: dqPlayerId }, data: { isWinner: false } });
  await tx.matchPlayer.update({ where: { id: opponentId }, data: { isWinner: true } });
  await tx.auditLog.create({ /* ... */ });
});
```

### Anti-Patterns to Avoid

- **Server-side rendering interactive components:** Never render interactive elements (buttons, forms) in Server Components - use 'use client'
- **Client-side initial data fetching:** Always pass initial data from Server Component, don't fetch on mount
- **Missing authorization checks:** Every admin route MUST call requireTournamentAdmin
- **Stale data:** Use `cache: 'no-store'` for admin views (as per STATE.md)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative timestamps | Custom date math | date-fns `formatDistanceToNow` | Handles edge cases, locale support |
| Confirmation dialogs | Custom overlay | Radix Dialog (already in Modal.tsx) | Accessibility, animations |
| Table expandable rows | Custom collapse logic | Conditional rendering with state | Simple enough without library |
| Toast notifications | Custom toast | Existing Toast component in @fightrise/ui | Consistent styling |
| Filter dropdowns | Custom select | Radix Select (existing pattern) | Accessibility |

---

## Common Pitfalls

### Pitfall 1: Race Condition in DQ
**What goes wrong:** Two admins DQ different players in the same match simultaneously
**Why it happens:** No state guard on match update
**How to avoid:** Use `updateMany` with state filter, check `count === 0` (already in dqService.ts)
**Warning signs:** "Match has already been completed or DQd" errors in logs

### Pitfall 2: Stale Data in Admin Views
**What goes wrong:** Admin sees outdated match list after DQ
**Why it happens:** Default Next.js caching
**How to avoid:** Use `cache: 'no-store'` in fetch calls (already documented in STATE.md)

### Pitfall 3: Missing User Link in MatchPlayer
**What goes wrong:** Can't show Discord username for players without linked accounts
**Why it happens:** MatchPlayer.userId can be null
**How to avoid:** Always show playerName (cached) as fallback, only show Discord name when userId exists

### Pitfall 4: Start.gg Sync Failure Not Handled
**What goes wrong:** DQ succeeds locally but fails to sync to Start.gg, causing data mismatch
**Why it happens:** No sync implementation yet (TODO in dqService.ts)
**How to avoid:** Add sync mutation, handle failures gracefully with retry queue

---

## Code Examples

### Match List API Pattern
```typescript
// apps/web/app/api/tournaments/[id]/admin/matches/route.ts
import { prisma, MatchState } from '@fightrise/database';
import { requireTournamentAdmin } from '@/lib/tournament-admin';

const filterSchema = z.object({
  state: z.enum(['NOT_STARTED', 'CALLED', 'CHECKED_IN', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'COMPLETED', 'DISPUTED', 'DQ']).optional(),
  round: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export async function GET(request: NextRequest, { params }) {
  const { id: tournamentId } = await params;
  const authResult = await requireTournamentAdmin(request, tournamentId);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const filter = filterSchema.safeParse(/* ... */);

  const matches = await prisma.match.findMany({
    where: {
      event: { tournamentId },
      state: filter.data.state,
      round: filter.data.round,
    },
    include: {
      players: { include: { user: true } },
      event: true,
    },
    orderBy: { round: 'asc' },
    skip, take,
  });

  return NextResponse.json({ matches: matches.map(formatMatch), pagination: /* ... */ });
}
```

### DQ API Pattern
```typescript
// apps/web/app/api/tournaments/[id]/admin/players/[playerId]/dq/route.ts
import { dqPlayer } from '@fightrise/database'; // Need to export or create new function

export async function POST(request: NextRequest, { params }) {
  const { id: tournamentId, playerId } = await params;
  const authResult = await requireTournamentAdmin(request, tournamentId);
  if (authResult instanceof NextResponse) return authResult;

  const { userId: adminUserId } = authResult;
  const { reason } = await request.json();

  const result = await dqPlayer(params.matchId, playerId, reason, adminUserId);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  // TODO: Sync to Start.gg
  return NextResponse.json({ success: true, message: result.message });
}
```

### Client Table with Auto-Refresh
```typescript
// apps/web/components/admin/ClientMatchesTable.tsx
'use client';
import { useState, useEffect } from 'react';

export function ClientMatchesTable({ initialData, tournamentId }) {
  const [matches, setMatches] = useState(initialData.matches);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/admin/matches`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  return <MatchesTable matches={matches} onDQ={handleDQ} />;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server Actions for all mutations | API routes + client fetch | Pre-existing | Standard Next.js pattern |
| Client-side only data | Server Component initial + client refresh | Pre-existing | Better SEO, faster initial load |
| Custom auth in each route | requireTournamentAdmin helper | Phase 1 | Consistent authorization |

**Deprecated/outdated:**
- None identified for this phase.

---

## Open Questions

1. **Start.gg DQ Mutation**
   - What we know: dqService.ts has TODO, only reportSet mutation exists in startgg-client
   - What's unclear: Does Start.gg API support DQ via mutation? Need to verify via documentation
   - Recommendation: Check Start.gg GraphQL schema for disqualifyEntrant mutation or use reportSet with DQ flag

2. **Match Filtering by Player Name**
   - What we know: Need to filter matches where either player contains the search term
   - What's unclear: Performance at scale with 50+ matches per page
   - Recommendation: Use Prisma's OR with contains, add database index on playerName if needed

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/integration), Playwright (E2E) |
| Config file | apps/web/vitest.config.ts, playwright.config.ts |
| Quick run command | `npm run docker:test` (unit tests) |
| Full suite command | `npm run docker:test:e2e` (E2E) |
| Estimated runtime | ~60s unit, ~120s E2E |

### Phase Requirements Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| API-06 | DQ player via API | Integration | `npm run docker:test:integration` | Need to create |
| MATCH-01 | View matches with filters | E2E | `npm run docker:test:e2e` | Need to create |
| MATCH-02 | View match details | E2E | `npm run docker:test:e2e` | Need to create |
| MATCH-03 | View check-in status | E2E | `npm run docker:test:e2e` | Need to create |
| DQ-01 | DQ player from UI | E2E | `npm run docker:test:e2e` | Need to create |
| DQ-02 | DQ requires reason | E2E | `npm run docker:test:e2e` | Need to create |
| DQ-03 | DQ creates audit log | Integration | `npm run docker:test:integration` | Need to create |
| DQ-04 | DQ syncs to Start.gg | Integration | `npm run docker:test:integration` | Need to create (MSW) |

### Nyquist Sampling Rate
- **Minimum sample interval:** After every committed task -> run: `npm run docker:test`
- **Full suite trigger:** Before merging final task of any plan wave
- **Phase-complete gate:** Full suite green before `/gsd:verify-work` runs
- **Estimated feedback latency per task:** ~60 seconds

### Wave 0 Gaps (must be created before implementation)
- [ ] `apps/web/__tests__/e2e/matches.spec.ts` — covers MATCH-01, MATCH-02, MATCH-03, DQ-01, DQ-02
- [ ] `packages/database/src/__tests__/match-queries.ts` — test utilities for match queries
- [ ] `packages/startgg-client/src/__mocks__/handlers.ts` — add DQ mutation mock for DQ-04
- None — existing test infrastructure covers API validation tests

---

## Sources

### Primary (HIGH confidence)
- Project codebase: Match model schema, dqService.ts, registrations page pattern
- Prisma documentation: Transaction patterns, query options
- Radix UI documentation: Dialog, Select, Tooltip components

### Secondary (MEDIUM confidence)
- Start.gg API: Need to verify DQ mutation availability (research gap)
- date-fns: formatDistanceToNow for relative timestamps

### Tertiary (LOW confidence)
- None identified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in project
- Architecture: HIGH - Follows existing Phase 1/2 patterns exactly
- Pitfalls: HIGH - Based on existing code review and STATE.md findings
- Start.gg DQ sync: LOW - Needs verification

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days - stable domain)
