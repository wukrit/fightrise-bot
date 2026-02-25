# Codebase Structure

**Analysis Date:** 2026-02-25

## Directory Layout

```
/home/ubuntu/fightrise-bot/
├── apps/                        # Applications
│   ├── bot/                     # Discord bot (discord.js v14, BullMQ)
│   └── web/                     # Next.js 14 web portal (App Router)
├── packages/                    # Shared packages
│   ├── database/                # Prisma schema and client
│   ├── shared/                  # Types, constants, validation
│   ├── startgg-client/          # GraphQL API wrapper
│   └── ui/                      # Radix UI components
├── docs/                        # Documentation
├── docker/                      # Docker configuration
├── scripts/                     # Utility scripts
└── .planning/codebase/          # Codebase analysis docs
```

## Directory Purposes

### Applications

**Discord Bot (`apps/bot/`):**
- Purpose: Discord bot for tournament management
- Contains:
  - `src/commands/` - Slash commands (9 commands)
  - `src/events/` - Discord event handlers
  - `src/handlers/` - Button/modal interactions
  - `src/services/` - Business logic (6 services)
  - `src/workers/` - BullMQ job workers
  - `src/__tests__/` - Test harness and tests
  - `src/lib/` - Redis client, logger

**Web Portal (`apps/web/`):**
- Purpose: Next.js 14 web portal for tournament viewing
- Contains:
  - `app/` - Next.js App Router pages and API routes
  - `app/api/` - REST API endpoints
  - `app/(auth)/` - Authentication pages
  - `app/dashboard/` - User dashboard
  - `app/tournaments/` - Tournament pages
  - `app/account/` - User account settings
  - `components/` - React components
  - `lib/` - Auth configuration

### Packages

**Database (`packages/database/`):**
- Purpose: Prisma ORM and database schema
- Contains:
  - `prisma/schema.prisma` - 11 database models
  - `src/index.ts` - Prisma client export
  - `src/__tests__/` - Test utilities and seeders

**Shared (`packages/shared/`):**
- Purpose: Shared types, constants, validation
- Contains:
  - `src/types.ts` - TypeScript interfaces
  - `src/constants.ts` - Poll intervals, Discord colors
  - `src/validation.ts` - Zod schemas
  - `src/errors.ts` - Custom error classes
  - `src/interactions.ts` - Interaction ID parsing

**Start.gg Client (`packages/startgg-client/`):**
- Purpose: GraphQL API wrapper for Start.gg
- Contains:
  - `src/client.ts` - GraphQL client with retry/caching
  - `src/queries/` - GraphQL queries
  - `src/mutations/` - GraphQL mutations
  - `src/__mocks__/` - MSW handlers for testing

**UI Components (`packages/ui/`):**
- Purpose: Shared React components using Radix UI
- Contains:
  - `src/Button.tsx` - Polymorphic button (Radix Slot)
  - `src/Modal.tsx` - Modal (Radix Dialog)
  - `src/Drawer.tsx` - Drawer (Radix Dialog)
  - `src/Select.tsx` - Select (Radix Select)
  - `src/Tooltip.tsx` - Tooltip (Radix Tooltip)
  - `src/Form.tsx` - Form with validation
  - `src/Input.tsx`, `Textarea.tsx` - Form inputs

## Key File Locations

### Entry Points

- Bot: `apps/bot/src/index.ts` - Discord bot initialization
- Web: `apps/web/app/layout.tsx` - Next.js root layout
- Web API: `apps/web/app/api/` - API route handlers

### Configuration

- Database schema: `packages/database/prisma/schema.prisma`
- NextAuth config: `apps/web/lib/auth.ts`
- Turborepo config: `turbo.json`

### Core Logic

- Command router: `apps/bot/src/events/interactionCreate.ts`
- Button router: `apps/bot/src/handlers/buttonHandlers.ts`
- Polling service: `apps/bot/src/services/pollingService.ts`
- Start.gg client: `packages/startgg-client/src/client.ts`

### Testing

- Bot test harness: `apps/bot/src/__tests__/harness/`
- Start.gg mocks: `packages/startgg-client/src/__mocks__/`
- Web E2E tests: `apps/web/__tests__/e2e/`

## Naming Conventions

**Files:**
- Commands: `*.ts` (e.g., `tournament.ts`, `register.ts`)
- Services: `*Service.ts` (e.g., `pollingService.ts`)
- Handlers: `*.ts` (e.g., `checkin.ts`, `scoreHandler.ts`)
- Components (React): `*.tsx` (e.g., `Button.tsx`, `Modal.tsx`)
- Tests: `*.test.ts`, `*.integration.test.ts`

**Directories:**
- Commands: `commands/`
- Events: `events/`
- Handlers: `handlers/`
- Services: `services/`
- Tests: `__tests__/`
- API routes: `api/[endpoint]/route.ts`

**Types:**
- Interfaces: `PascalCase` (e.g., `MatchState`, `TournamentState`)
- Enums: `PascalCase` (defined in Prisma schema)
- Type aliases: `camelCase` where appropriate

## Where to Add New Code

### New Discord Command

- Implementation: `apps/bot/src/commands/[command-name].ts`
- Tests: `apps/bot/src/__tests__/integration/[command-name].integration.test.ts`

### New Button Handler

- Implementation: `apps/bot/src/handlers/[handler-name].ts`
- Register in: `apps/bot/src/handlers/index.ts`

### New Service

- Implementation: `apps/bot/src/services/[service-name].Service.ts`
- Tests: `apps/bot/src/services/__tests__/[service-name].test.ts`

### New Web Page

- Implementation: `apps/web/app/[route]/page.tsx`
- Client component: `apps/web/app/[route]/[component]Client.tsx`
- API endpoints: `apps/web/app/api/[resource]/route.ts`

### New UI Component

- Implementation: `packages/ui/src/[ComponentName].tsx`
- Tests: `packages/ui/src/[ComponentName].test.tsx`

### New Database Model

- Add to: `packages/database/prisma/schema.prisma`
- Run: `npm run db:generate` (from packages/database or root)
- Run: `npm run db:push` (dev) or `npm run db:migrate` (production)

### New Start.gg Query/Mutation

- Query: `packages/startgg-client/src/queries/get[Entity].ts`
- Mutation: `packages/startgg-client/src/mutations/[action].ts`
- Types: `packages/startgg-client/src/types.ts`

## Special Directories

**`.planning/codebase/`:**
- Purpose: Codebase analysis documents
- Generated: Yes (by GSD agent)
- Committed: Yes

**`docs/`:**
- Purpose: Project documentation
- Generated: No
- Committed: Yes

**`docker/`:**
- Purpose: Docker Compose and Dockerfile configurations
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-02-25*
