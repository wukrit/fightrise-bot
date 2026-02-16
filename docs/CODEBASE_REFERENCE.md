# FightRise Codebase Reference

A comprehensive reference guide for understanding and working with the FightRise codebase.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Models](#database-models)
4. [Services](#services)
5. [Commands & Handlers](#commands--handlers)
6. [Code Patterns](#code-patterns)
7. [Key Files](#key-files)
8. [Testing](#testing)

---

## Project Overview

**FightRise** is a Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| Discord Bot | discord.js v14, BullMQ |
| Web | Next.js 14 (App Router), NextAuth |
| Database | PostgreSQL, Prisma ORM |
| Cache/Queue | Redis |
| API | Start.gg GraphQL |
| Testing | Vitest, Playwright, MSW |

### Data Flow

1. **Start.gg Polling**: BullMQ jobs poll Start.gg GraphQL API (no webhooks)
2. **Match Ready**: Bot creates Discord thread, pings players
3. **Check-in**: Players use Discord buttons to check in
4. **Score Reporting**: Players report scores via buttons; loser confirmation auto-submits to Start.gg
5. **Sync Back**: Results reported to Start.gg via GraphQL mutation

---

## Architecture

### Directory Structure

```
fightrise-bot/
├── apps/
│   ├── bot/                    # Discord bot application
│   │   └── src/
│   │       ├── commands/        # Slash commands (9)
│   │       ├── events/          # Discord event handlers
│   │       ├── handlers/        # Button/modal interactions
│   │       ├── services/        # Business logic (6)
│   │       ├── workers/         # BullMQ workers
│   │       ├── index.ts         # Bot entry point
│   │       └── __tests__/       # Tests & harness
│   │
│   └── web/                    # Next.js web portal
│       └── app/
│           ├── (auth)/          # Auth pages
│           ├── api/             # API routes
│           ├── dashboard/       # User dashboard
│           ├── tournaments/     # Tournament pages
│           └── account/         # Account settings
│
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── startgg-client/         # GraphQL API wrapper
│   ├── shared/                 # Types & utilities
│   └── ui/                     # React components
│
└── docker/                     # Docker configurations
```

### Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Discord bot core | ✅ Complete | Commands, events, handlers |
| Match thread creation | ✅ Complete | Auto-threads for matches |
| Check-in flow | ✅ Complete | Button interactions |
| Score reporting | ✅ Complete | With confirmation |
| Start.gg polling | ✅ Complete | BullMQ workers |
| Registration sync | ✅ Complete | Start.gg sync |
| OAuth token encryption | ✅ Complete | AES-256 |
| Admin audit logging | ✅ Complete | Full tracking |
| Web portal pages | ⚠️ Partial | Auth done, building |
| Start.gg OAuth | ⚠️ Partial | Provider configured |

---

## Database Models

### All 11 Prisma Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Discord/Start.gg account linking | discordId, startggId, startggToken |
| `Tournament` | Tournament configuration | startggId, discordGuildId, settings |
| `Event` | Tournament events (games) | startggId, tournamentId, state |
| `Match` | Individual matches | startggSetId, state, discordThreadId |
| `MatchPlayer` | Match participants | matchId, userId, isCheckedIn |
| `GameResult` | Game-level scores | matchPlayerId, gameNumber, winnerId |
| `Dispute` | Match disputes | matchId, initiatorId, status |
| `Registration` | Tournament registrations | userId, tournamentId, source |
| `TournamentAdmin` | Admin roles | userId, tournamentId, role |
| `GuildConfig` | Guild settings | discordGuildId, channels |
| `AuditLog` | Admin action logs | action, entityType, userId |

### Enums

```typescript
// Tournament state
enum TournamentState {
  CREATED, REGISTRATION_OPEN, REGISTRATION_CLOSED,
  IN_PROGRESS, COMPLETED, CANCELLED
}

// Match state
enum MatchState {
  NOT_STARTED, CALLED, CHECKED_IN, IN_PROGRESS,
  PENDING_CONFIRMATION, COMPLETED, DISPUTED, DQ
}

// Registration
enum RegistrationSource { STARTGG, DISCORD, MANUAL }
enum RegistrationStatus { PENDING, CONFIRMED, CANCELLED, DQ }
enum AdminRole { OWNER, ADMIN, MODERATOR }
```

---

## Services

### Bot Services (`apps/bot/src/services/`)

| Service | File | Purpose |
|---------|------|---------|
| Polling | `pollingService.ts` | BullMQ-based tournament polling with dynamic intervals |
| Match | `matchService.ts` | Thread creation, check-in, score handling |
| Tournament | `tournamentService.ts` | Setup, config, admin management |
| Registration Sync | `registrationSyncService.ts` | Sync registrations from Start.gg |
| Audit | `auditService.ts` | Admin action logging |
| DQ | `dqService.ts` | Disqualification handling |

### Polling Intervals

```typescript
const POLL_INTERVALS = {
  ACTIVE: 15 * 1000,        // 15s during matches
  REGISTRATION: 60 * 1000,   // 1min during registration
  INACTIVE: 300 * 1000,      // 5min when inactive
};
```

---

## Commands & Handlers

### Slash Commands (`apps/bot/src/commands/`)

| Command | File | Status |
|---------|------|--------|
| `/tournament setup` | `tournament.ts` | ✅ Complete |
| `/tournament status` | `tournament.ts` | ✅ Complete |
| `/register` | `register.ts` | ✅ Complete |
| `/checkin` | `checkin.ts` | ✅ Complete |
| `/report` | `report.ts` | ✅ Complete |
| `/my-matches` | `my-matches.ts` | ✅ Complete |
| `/link-startgg` | `link-startgg.ts` | ✅ Complete |
| `/unlink-startgg` | `unlink-startgg.ts` | ✅ Complete |
| `/admin` | `admin.ts` | ✅ Complete |

### Button Handlers (`apps/bot/src/handlers/`)

| Handler | File | Purpose |
|---------|------|---------|
| Check-in | `checkin.ts` | Player check-in buttons |
| Score | `scoreHandler.ts` | Score reporting, confirmation |
| Registration | `registration.ts` | Registration flows |
| Router | `buttonHandlers.ts` | Routes to specific handlers |

---

## Code Patterns

### Discord Command Pattern

```typescript
// apps/bot/src/commands/example.ts
import { SlashCommandBuilder } from 'discord.js';

export const exampleCommand = {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('Example command')
    .addStringOption(option =>
      option.setName('input').setDescription('Input').setRequired(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    // Handle autocomplete
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    // Command logic
  },
};
```

### Button Handler Pattern

```typescript
// apps/bot/src/handlers/buttonHandlers.ts
export interface ButtonHandler {
  prefix: string;
  execute(interaction: ButtonInteraction, parts: string[]): Promise<void>;
}

export const buttonHandlers: Record<string, ButtonHandler> = {
  [INTERACTION_PREFIX.CHECKIN]: checkinHandler,
  [INTERACTION_PREFIX.REPORT]: scoreHandler,
};
```

### Idempotent Database Operations

```typescript
// Use updateMany with conditions for idempotency
const result = await prisma.match.updateMany({
  where: { id: matchId, state: MatchState.NOT_STARTED },
  data: { discordThreadId: thread.id, state: MatchState.CALLED },
});

if (result.count === 0) {
  // Already processed - skip
  return;
}
```

### Database Transactions

```typescript
// Atomic operations
await prisma.$transaction(async (tx) => {
  await tx.match.update({ where: { id }, data: { state: 'IN_PROGRESS' } });
  await tx.matchPlayer.updateMany({ where: { matchId: id }, data: { isCheckedIn: true } });
});
```

---

## Key Files

### Bot

| File | Purpose |
|------|---------|
| `apps/bot/src/index.ts` | Bot entry, client setup |
| `apps/bot/src/events/interactionCreate.ts` | Routes slash commands |
| `apps/bot/src/handlers/buttonHandlers.ts` | Routes button interactions |
| `apps/bot/src/services/pollingService.ts` | Tournament polling |

### Database

| File | Purpose |
|------|---------|
| `packages/database/prisma/schema.prisma` | All 11 models |
| `packages/database/src/index.ts` | Prisma client singleton |

### Start.gg Client

| File | Purpose |
|------|---------|
| `packages/startgg-client/src/client.ts` | GraphQL client with retry |
| `packages/startgg-client/src/queries/` | GraphQL queries |
| `packages/startgg-client/src/mutations/` | GraphQL mutations |

### Web

| File | Purpose |
|------|---------|
| `apps/web/lib/auth.ts` | NextAuth configuration |
| `apps/web/middleware.ts` | Auth protection |

---

## Testing

### Test Infrastructure

| Layer | Tool | Location |
|-------|------|----------|
| Unit | Vitest | `apps/*/src/**/*.test.ts` |
| Integration | Vitest + Testcontainers | `apps/*/src/__tests__/` |
| E2E | Playwright | `apps/web/__tests__/e2e/` |

### Test Commands

```bash
# Start infrastructure
npm run docker:infra

# Push schema
npm run docker:db:push

# Run tests
npm run docker:test           # Unit tests
npm run docker:test:integration  # Integration tests
npm run docker:test:e2e       # E2E tests
npm run docker:lint           # Linting

# Smoke tests (requires .env)
npm run docker:test:smoke
```

### Test Harnesses

- **Discord**: `apps/bot/src/__tests__/harness/` - Mock client, interactions, channels
- **Start.gg**: `packages/startgg-client/src/__mocks__/` - MSW handlers
- **Database**: `packages/database/src/__tests__/` - Testcontainers setup

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://fightrise:fightrise@localhost:5432/fightrise"

# Redis
REDIS_URL="redis://localhost:6379"

# Discord
DISCORD_TOKEN="bot-token"
DISCORD_CLIENT_ID="client-id"
DISCORD_CLIENT_SECRET="client-secret"

# Start.gg
STARTGG_API_KEY="api-key"

# NextAuth
NEXTAUTH_SECRET="secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Quick Reference

```bash
# Development
npm run docker:dev           # Full stack
npm run dev -- --filter=@fightrise/bot  # Bot only
npm run dev -- --filter=@fightrise/web   # Web only

# Database
npm run docker:db:generate   # Generate client
npm run docker:db:push      # Push schema

# Commands
npm run docker:deploy        # Deploy Discord commands

# Testing
npm run docker:test && npm run docker:test:integration
```
