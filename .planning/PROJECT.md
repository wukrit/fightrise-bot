# FightRise - Web Portal Admin Features

## What This Is

A Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord. This milestone adds admin API endpoints and web UI pages for tournament management.

**What this specifically adds:**
- REST API for tournament administration (registrations, DQs, seeding)
- Web portal admin pages for tournament management

## Core Value

Run Start.gg tournaments entirely within Discord — now with web-based admin tools.

## Requirements

### Validated

- ✓ Discord bot with 9 slash commands — existing
- ✓ Match thread creation and player check-in — existing
- ✓ Score reporting with loser confirmation — existing
- ✓ Start.gg polling via BullMQ workers — existing
- ✓ Web portal with auth and basic pages — existing

### Active

- [ ] Admin API endpoints for tournament management
- [ ] Admin web portal pages for tournament administration

### Out of Scope

- Real-time match updates (WebSocket) — high complexity, defer
- Tournament creation from web — can use Discord bot for v1

## Context

**Existing codebase:**
- Discord bot: `apps/bot/` — discord.js v14, BullMQ
- Web portal: `apps/web/` — Next.js 14 App Router
- Database: Prisma with 11 models (packages/database/)
- Start.gg client: GraphQL wrapper (packages/startgg-client/)

**What's missing (from CONCERNS.md):**
- Admin API endpoints
- Registration API
- DQ API
- Check-in API
- Admin UI pages

## Constraints

- **Tech stack**: Must use existing Next.js + React + Radix UI stack
- **Authentication**: Discord OAuth (existing) + role-based access for admins
- **API design**: RESTful, consistent with existing API routes in `apps/web/app/api/`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full admin (API + UI) | User requested complete admin functionality | — Pending |

---
*Last updated: 2026-02-25 after initialization*
