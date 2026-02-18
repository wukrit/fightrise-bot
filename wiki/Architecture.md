---
title: Architecture
---

# Architecture

This document provides a high-level overview of the FightRise system architecture.

## System Overview

```mermaid
flowchart TB
    subgraph External["External Services"]
        Discord["Discord API"]
        StartGG["Start.gg GraphQL API"]
    end

    subgraph Apps["FightRise Applications"]
        subgraph Bot["Discord Bot (apps/bot)"]
            Commands["Slash Commands"]
            Events["Event Handlers"]
            Handlers["Button/Modal Handlers"]
            Workers["BullMQ Workers"]
            Services["Services Layer"]
        end

        subgraph Web["Web Portal (apps/web)"]
            Pages["Next.js Pages"]
            API["API Routes"]
            Auth["NextAuth.js"]
        end
    end

    subgraph Packages["Shared Packages"]
        DB["Database<br/>(Prisma)"]
        StartGGClient["Start.gg Client"]
        Shared["Shared Types"]
        UI["UI Components"]
    end

    subgraph Infrastructure["Infrastructure"]
        Postgres[(PostgreSQL)]
        Redis[(Redis)]
    end

    %% Discord Bot Flow
    Discord --> Commands
    Discord --> Events
    Commands --> Handlers
    Events --> Handlers
    Handlers --> Services
    Services --> Workers
    Workers --> StartGGClient

    %% Web Portal Flow
    Web --> Pages
    Web --> API
    Web --> Auth
    API --> DB

    %% Service Dependencies
    Services --> DB
    Services --> StartGGClient
    StartGGClient --> StartGG
    Pages --> UI

    %% Database
    DB --> Postgres
    Workers --> Redis
```

## Data Flow

### 1. Tournament Data Sync (Start.gg → Discord)

```mermaid
sequenceDiagram
    participant User
    participant Discord
    participant Bot
    participant StartGG
    participant DB
    participant Queue

    User->>Discord: /tournament setup
    Discord->>Bot: Command interaction
    Bot->>StartGG: Fetch tournament data
    StartGG-->>Bot: Tournament info
    Bot->>DB: Save tournament
    Bot->>Discord: Confirm setup

    loop Polling (BullMQ)
        Queue->>Bot: Process poll job
        Bot->>StartGG: Query tournament state
        StartGG-->>Bot: Updated data
        Bot->>DB: Update matches
        Note over Bot: Match ready → Create thread
        Bot->>Discord: Create match thread
    end
```

### 2. Match Flow (Check-in → Report → Sync)

```mermaid
sequenceDiagram
    participant Player
    participant Discord
    participant Bot
    participant DB
    participant StartGG

    Note over Player,Discord: Match Ready
    Discord->>Player: Thread + @mention

    Note over Player,Discord: Check-in
    Player->>Discord: Click check-in button
    Discord->>Bot: Button interaction
    Bot->>DB: Update check-in status
    Bot->>Discord: Confirm check-in

    Note over Player,Discord: Score Reporting
    Player->>Discord: /report score
    Discord->>Bot: Command interaction
    Bot->>DB: Record score
    Bot->>Discord: Request confirmation

    Player->>Discord: Confirm result
    Discord->>Bot: Confirmation
    Bot->>StartGG: Submit result
    StartGG-->>Bot: Confirmation
    Bot->>DB: Mark complete
    Bot->>Discord: Finalize thread
```

## Directory Structure

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
│   │       └── index.ts         # Bot entry point
│   │
│   └── web/                    # Next.js web portal
│       └── app/
│           ├── (auth)/          # Auth pages
│           ├── api/             # API routes
│           ├── dashboard/       # User dashboard
│           └── tournaments/     # Tournament pages
│
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── startgg-client/         # GraphQL API wrapper
│   ├── shared/                 # Types & utilities
│   └── ui/                     # React components
│
└── docker/                     # Docker configurations
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Discord Bot** | discord.js v14, BullMQ, ioredis |
| **Web Portal** | Next.js 14 (App Router), NextAuth.js |
| **Database** | PostgreSQL, Prisma ORM |
| **API Client** | GraphQL (urql), Start.gg API |
| **UI** | React, Shared component library |
| **Infrastructure** | Docker, Redis, PostgreSQL |

## Key Patterns

### Idempotent Database Operations

```typescript
const result = await prisma.match.updateMany({
  where: { id: matchId, state: MatchState.NOT_STARTED },
  data: { discordThreadId: thread.id, state: MatchState.CALLED },
});

if (result.count === 0) {
  // Already processed - skip
  return;
}
```

### Transactional Updates

```typescript
await prisma.$transaction(async (tx) => {
  await tx.match.update({ where: { id }, data: { state: 'IN_PROGRESS' } });
  await tx.matchPlayer.updateMany({
    where: { matchId: id },
    data: { isCheckedIn: true }
  });
});
```

### Service Layer Separation

- **Commands/Handlers**: Discord interaction handling
- **Services**: Business logic, database operations
- **Workers**: Async job processing (polling and sync)

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL 15 database |
| redis | 6379 | Redis 7 for BullMQ queues |
| bot | - | Discord bot (no exposed port) |
| web | 3000 | Next.js web portal |

## Related Documentation

- [Codebase Reference](Codebase-Reference) - Detailed code documentation
- [API Reference](/wiki/API-Reference) - Web API endpoints
- [Database Schema](https://github.com/wukrit/fightrise-bot/blob/main/packages/database/prisma/schema.prisma)
