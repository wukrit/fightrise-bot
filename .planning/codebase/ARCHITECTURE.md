# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Event-driven microservice architecture within a Turborepo monorepo

**Key Characteristics:**
- Two main applications (bot and web) communicating via shared packages
- Polling-based integration with Start.gg GraphQL API (no webhooks available)
- Discord-first design with bidirectional sync to web portal
- BullMQ job queue for tournament state polling
- Next.js 14 App Router for web portal

## Layers

### Application Layer

**Discord Bot (`apps/bot/`):**
- Location: `apps/bot/src/`
- Contains: Slash commands, event handlers, button interactions, BullMQ workers
- Depends on: `@fightrise/database`, `@fightrise/startgg-client`, `@fightrise/shared`
- Entry point: `apps/bot/src/index.ts`

**Web Portal (`apps/web/`):**
- Location: `apps/web/app/`
- Contains: Next.js 14 pages, API routes, authentication
- Depends on: `@fightrise/database`, `@fightrise/shared`, `@fightrise/ui`
- Entry point: `apps/web/app/layout.tsx` (Next.js App Router)

### Shared Package Layer

**Database (`packages/database/`):**
- Purpose: Prisma ORM client and database schema
- Location: `packages/database/prisma/schema.prisma`
- Contains: 11 models with all relations (User, Tournament, Event, Match, MatchPlayer, GameResult, Dispute, Registration, TournamentAdmin, GuildConfig, AuditLog)
- Used by: Both apps

**Start.gg Client (`packages/startgg-client/`):**
- Purpose: GraphQL API wrapper with caching and retry logic
- Location: `packages/startgg-client/src/client.ts`
- Contains: Queries (`getTournament`, `getEventSets`, `getEventEntrants`), Mutations (`reportSet`)
- Used by: Bot only (polling service)

**Shared (`packages/shared/`):**
- Purpose: Types, constants, validation schemas, utilities
- Location: `packages/shared/src/`
- Contains: `constants.ts` (poll intervals, Discord colors), `types.ts`, `validation.ts` (Zod schemas), `errors.ts`, `interactions.ts`
- Used by: Both apps

**UI Components (`packages/ui/`):**
- Purpose: Shared React components using Radix UI primitives
- Location: `packages/ui/src/`
- Contains: Button, Modal, Drawer, Select, Tooltip, Form, Input, etc.
- Used by: Web app only

## Data Flow

**Tournament Polling Flow:**

1. **PollingService** (`apps/bot/src/services/pollingService.ts`) starts on bot initialization
2. BullMQ worker polls active tournaments at configurable intervals:
   - 15 seconds during active play
   - 1 minute during registration
   - 5 minutes when inactive
3. For each tournament event:
   - Fetches matches from Start.gg via `startggClient.getEventSets()`
   - Creates new Match records in database for ready sets
   - Creates Discord threads for new matches via `matchService.createMatchThread()`
4. Registration sync runs alongside match polling

**Match Flow:**

1. **Match Ready**: Polling detects ready set → Creates Discord thread
2. **Check-in**: Players click check-in button → `checkinHandler` updates MatchPlayer.isCheckedIn
3. **Score Reporting**: Winner reports score → `scoreHandler` records result
4. **Confirmation**: Loser confirms (or timeout) → Score synced to Start.gg via mutation
5. **Completion**: Match state set to COMPLETED → Thread archived

**Web Authentication Flow:**

1. User signs in via Discord OAuth at `/auth/signin`
2. NextAuth callback creates/updates User record in database
3. Session JWT stored in secure cookie
4. API routes use `getAuthenticatedUser()` to verify session or API key

## Key Abstractions

**Button Handler Pattern:**
- Purpose: Route Discord button interactions to appropriate handlers
- Examples: `apps/bot/src/handlers/checkin.ts`, `apps/bot/src/handlers/scoreHandler.ts`
- Pattern: `buttonHandlers` Map keyed by interaction prefix (`INTERACTION_PREFIX.CHECK_IN`, etc.)

**Service Pattern:**
- Purpose: Business logic encapsulated in services
- Examples: `pollingService.ts`, `matchService.ts`, `tournamentService.ts`, `registrationSyncService.ts`
- Pattern: Async methods with Prisma transactions for atomicity

**Command Pattern:**
- Purpose: Discord slash commands
- Examples: `apps/bot/src/commands/tournament.ts`, `apps/bot/src/commands/register.ts`
- Pattern: `SlashCommandBuilder` with `execute()` method

## Entry Points

**Bot Entry:**
- Location: `apps/bot/src/index.ts`
- Triggers: `npm run start:bot` or Docker container start
- Responsibilities: Initialize Discord client, load commands, load events, start polling service

**Web Entry:**
- Location: `apps/web/app/layout.tsx`
- Triggers: HTTP request to any route
- Responsibilities: Render Next.js app, provide session context

**Command Router:**
- Location: `apps/bot/src/events/interactionCreate.ts`
- Triggers: Discord interaction events
- Responsibilities: Route slash commands and buttons to handlers, rate limiting

**API Routes:**
- Location: `apps/web/app/api/*/route.ts`
- Triggers: HTTP requests to `/api/*` endpoints
- Responsibilities: REST API for web portal functionality

## Error Handling

**Strategy:** Service-level error handling with centralized logging

**Patterns:**
- Bot: Try-catch in command handlers, error replied to user ephemerally
- Services: Log errors with context, throw specific error types
- Web: Next.js error boundaries, API route error responses

**Error Types:**
- Custom errors in `packages/shared/src/errors.ts`: `StartGGError`, `AuthError`, `ValidationError`

## Cross-Cutting Concerns

**Logging:** Winston-based logger via `apps/bot/src/lib/logger.js`
**Validation:** Zod schemas in `packages/shared/src/validation.ts`
**Authentication:** NextAuth.js with Discord OAuth in `apps/web/lib/auth.ts`
**Rate Limiting:** Redis-based sliding window in `apps/bot/src/events/interactionCreate.ts`

---

*Architecture analysis: 2026-02-25*
