# Project Research Summary

**Project:** FightRise Admin Web Portal
**Domain:** Tournament Admin Web Portals in Next.js with Discord Integration
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

FightRise is building a tournament admin web portal that complements the existing Discord bot for managing Start.gg tournaments. The research confirms that the existing tech stack (Next.js 14, NextAuth, Prisma, Radix UI) is well-suited for this work, with only minor additions needed (React Query, react-hook-form). The core challenge is not technology selection but architectural coherence between the Discord bot and web portal.

The critical insight from research is the **authorization gap** between Discord and web admin interfaces. Admins who have permissions in one channel cannot perform the same actions in the other without explicit database records. This must be solved in Phase 1 to avoid security vulnerabilities. Additionally, the web portal must share validation logic with the Discord bot to prevent inconsistent behavior.

The recommended approach builds the admin API using Next.js Route Handlers with explicit RBAC checks, leverages Server Actions for mutations, and designs admin pages as Server Components that fetch fresh data (no stale caching). This architecture follows established Next.js patterns and integrates cleanly with existing FightRise infrastructure.

## Key Findings

### Recommended Stack

The project reuses existing FightRise infrastructure with targeted additions:

**Core technologies (already in use):**
- Next.js 14 — API routes with Route Handlers
- NextAuth.js 4.24 — Discord OAuth, JWT sessions
- Prisma 5.7 — ORM with existing schema
- Zod 4.x — Schema validation
- Redis (ioredis) — Rate limiting via existing ratelimit.ts

**New additions for admin features:**
- @tanstack/react-query 5 — Client-side data fetching for real-time admin dashboards
- react-hook-form 7 + @hookform/resolvers — Form handling with Zod validation
- @radix-ui/react-table 1.1 — Admin table components

**Authentication pattern:** Extend existing NextAuth with tournament-specific admin checks via the `TournamentAdmin` Prisma model. Create reusable `requireTournamentAdmin()` helper.

### Expected Features

**Must have (table stakes):**
- Tournament Dashboard — Central view of tournament state, entrants, matches
- Registration Management (list, approve, reject, bulk operations)
- Manual Registration — Add walk-ins or substitutions
- Match List with Filters — View matches by round, state
- Basic DQ (Disqualification) — Remove players with reason logging
- Admin Authentication — Discord OAuth + tournament admin role verification

**Should have (competitive advantage):**
- Seeding Management — Drag-drop reordering with Discord notifications
- Check-in Dashboard — Real-time status board with reminder buttons
- Audit Log Viewer — Full admin action history
- Match State Override — Emergency corrections

**Defer (v2+):**
- Full Bracket Visualization — Embed Start.gg instead
- Bulk Messaging — Requires careful rate limiting
- CSV Export — Nice-to-have
- Multi-event Management — For multi-game tournaments

### Architecture Approach

The recommended structure places admin routes under `/api/tournaments/[tournamentId]/admin/` and pages under `/tournaments/[tournamentId]/admin/`, following existing conventions. Business logic lives in `lib/admin/services/` with Server Actions for mutations.

**Major components:**
1. **Admin API Routes** (`app/api/tournaments/[id]/admin/*`) — REST endpoints with RBAC checks
2. **Admin Service Layer** (`lib/admin/`) — Reusable business logic for tournament operations
3. **Admin Pages** (`app/tournaments/[id]/admin/*`) — Server Components with fresh data fetching
4. **Admin Check Utility** — Reusable `verifyTournamentAdmin()` function with role-based permissions

### Critical Pitfalls

1. **Authorization Gap** — Discord admins lack web permissions. Prevention: Sync Discord roles to `TournamentAdmin` table, unified permission model.
2. **Missing Audit Trail** — Web actions not logged. Prevention: Call existing `auditService` from all admin API endpoints.
3. **State Desync** — Web shows stale Discord changes. Prevention: No caching for admin views, use `cache: 'no-store'`.
4. **API Authorization Gaps** — UI hides buttons but API accepts any authenticated request. Prevention: Verify permissions in every API endpoint.
5. **Race Conditions** — Concurrent check-ins/scores. Prevention: Use Prisma transactions with state validation.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Authorization
**Rationale:** The authorization gap is critical. Without solving Discord-web permission sync, all subsequent work creates security vulnerabilities.
**Delivers:**
- Unified admin permission model
- `requireTournamentAdmin()` helper
- Admin API route scaffolding with RBAC checks
- Basic tournament dashboard page
**Addresses:** Features - Admin Auth, Tournament Dashboard | Pitfalls - Authorization Gap, API Authorization
**Research Flags:** Standard patterns - Next.js auth is well-documented

### Phase 2: Core Admin API & Registration
**Rationale:** Registration management is the most frequent admin task. Must include audit logging and pagination from the start.
**Delivers:**
- Full Registration CRUD API
- Registration Server Actions (approve, reject, bulk)
- Registration admin page with table
- Audit logging integration
- Pagination on list endpoints
**Addresses:** Features - Registration Management, Manual Registration | Pitfalls - Audit Trail, Pagination, Race Conditions
**Research Flags:** Standard patterns - Prisma pagination is well-known

### Phase 3: Match Management
**Rationale:** Match operations are more complex (DQ, disputes) and depend on registration data.
**Delivers:**
- Match list API with filters
- DQ and dispute Server Actions
- Match admin page
- Match state override functionality
**Addresses:** Features - Match List, DQ Management, Match State Override
**Research Flags:** Needs validation - DQ cascade logic with Start.gg sync

### Phase 4: Seeding & Advanced Features
**Rationale:** Lower priority, builds on existing infrastructure.
**Delivers:**
- Seeding management API and UI
- Check-in dashboard
- Audit log viewer
**Addresses:** Features - Seeding Management, Check-in Dashboard, Audit Log
**Research Flags:** Standard patterns - Seeding is simple reorder, not bracket editing

### Phase Ordering Rationale

1. **Authorization first** — Security vulnerabilities are worse than missing features
2. **Registration before matches** — Can't have matches without registrants; this is the main workflow
3. **Matches before seeding** — Seeding depends on having entrants; match state affects seeding
4. **Audit throughout** — Every phase must integrate audit logging to avoid retrofitting

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Match Management):** DQ cascade logic needs careful handling with Start.gg sync. How does disqualifying a player affect the bracket in Start.gg? Need to verify Start.gg API capabilities.
- **Phase 4 (Seeding):** How to push seeding changes back to Start.gg? Need to verify mutation availability in startgg-client.

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Next.js authentication patterns are well-established
- **Phase 2:** Prisma CRUD operations are standard

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies already in use; additions are well-established |
| Features | HIGH | Based on competitor analysis and existing FightRise functionality |
| Architecture | HIGH | Standard Next.js App Router patterns with clear integration points |
| Pitfalls | HIGH | Identified from existing codebase analysis; concrete prevention strategies |

**Overall confidence:** HIGH

### Gaps to Address

1. **Start.gg DQ/Seeding API** — Need to verify mutations exist in startgg-client for pushing DQ and seeding changes. May need to add mutations.
2. **Discord Permission Sync** — The strategy to import Discord guild roles to TournamentAdmin needs validation with actual Discord OAuth scopes.
3. **Real-time Updates** — Simple polling approach recommended, but check-in dashboard may need SSE. Defer to Phase 4.

## Sources

### Primary (HIGH confidence)
- Context7: /vercel/next.js — Route Handlers, Server Actions, App Router patterns
- Context7: /nextauthjs/next-auth — RBAC patterns, session callbacks
- Existing codebase: apps/web/lib/auth.ts — Current auth implementation
- Existing codebase: apps/bot/src/services/auditService.ts — Audit logging pattern

### Secondary (MEDIUM confidence)
- Context7: /colinhacks/zod — Schema validation patterns
- Start.gg API documentation — For DQ and seeding mutation verification needed

### Tertiary (LOW confidence)
- Discord OAuth role scopes — Need verification during Phase 1 planning

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
