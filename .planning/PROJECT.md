# FightRise - Web Portal Admin Features

## What This Is

A Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord. This milestone adds admin API endpoints and web UI pages for tournament management.

**What this specifically adds:**
- REST API for tournament administration (registrations, DQs, seeding)
- Web portal admin pages for tournament management

## Core Value

Run Start.gg tournaments entirely within Discord — now with web-based admin tools.

## Requirements

## Current Milestone: v2.0 Testing Enhancements

**Goal:** Add comprehensive test coverage across all packages to improve reliability and enable confident future development.

**Target features:**
- Unit tests for bot commands and services
- Unit tests for web API routes and pages
- Integration tests for database operations
- Integration tests for Start.gg client
- E2E tests for web portal user flows

### Validated

- ✓ Discord bot with 9 slash commands — existing
- ✓ Match thread creation and player check-in — existing
- ✓ Score reporting with loser confirmation — existing
- ✓ Start.gg polling via BullMQ workers — existing
- ✓ Web portal with auth and basic pages — existing
- ✓ Admin API endpoints for tournament management — v1.0
- ✓ Admin web portal pages for tournament administration — v1.0
- ✓ Discord OAuth authentication — v1.0
- ✓ Tournament admin role-based access control — v1.0
- ✓ Registration CRUD with audit logging — v1.0
- ✓ Match management with filters — v1.0
- ✓ Player disqualification with Start.gg sync — v1.0
- ✓ Audit log viewing with tournament filtering — v1.0

### Active

- [ ] Unit tests for bot commands and services — v2.0
- [ ] Unit tests for web API routes and pages — v2.0
- [ ] Integration tests for database operations — v2.0
- [ ] Integration tests for Start.gg client — v2.0
- [ ] E2E tests for web portal user flows — v2.0

### Out of Scope

- Real-time match updates (WebSocket) — high complexity, defer
- Tournament creation from web — can use Discord bot

## Context

**Completed v1.0 Admin Web Portal** with:
- 30 requirements satisfied
- 4 phases completed
- Security fix for audit page tournament filtering

**Current codebase:**
- Discord bot: `apps/bot/` — discord.js v14, BullMQ
- Web portal: `apps/web/` — Next.js 14 App Router
- Database: Prisma with 11 models (packages/database/)
- Start.gg client: GraphQL wrapper (packages/startgg-client/)

## Constraints

- **Tech stack**: Must use existing Next.js + React + Radix UI stack
- **Authentication**: Discord OAuth (existing) + role-based access for admins
- **API design**: RESTful, consistent with existing API routes in `apps/web/app/api/`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full admin (API + UI) | User requested complete admin functionality | ✓ Complete in v1.0 |
| Security-first audit filtering | Prevent cross-tournament data leakage | ✓ Fixed in Phase 4 |
| Server-side filtering for audit | Match API route behavior | ✓ Consistent pattern |

---

*Last updated: 2026-02-26 after v1.0 milestone, starting v2.0*
