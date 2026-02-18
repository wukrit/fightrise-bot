---
title: Development
---

# Development

This guide covers the development workflow, testing, and contribution guidelines for FightRise.

## Project Structure

```
fightrise-bot/
├── apps/
│   ├── bot/                    # Discord bot (discord.js v14, BullMQ)
│   │   └── src/
│   │       ├── commands/        # Slash commands (9)
│   │       ├── events/          # Discord event handlers
│   │       ├── handlers/        # Button/modal interactions
│   │       ├── services/        # Business logic (6)
│   │       ├── workers/         # BullMQ workers
│   │       └── __tests__/       # Test harness
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

---

## Development Commands

```bash
# Docker development (recommended)
npm run docker:dev          # Full stack with hot-reload
npm run docker:dev:tunnel   # With Cloudflare Tunnel for OAuth
npm run docker:dev:tools    # With pgAdmin and Redis Commander
npm run docker:dev:all      # Everything
npm run docker:down         # Stop all services

# Run commands in Docker containers
npm run docker:db:generate  # Generate Prisma client
npm run docker:db:push      # Push schema to database
npm run docker:db:migrate   # Run migrations
npm run docker:deploy       # Deploy Discord commands
npm run docker:exec:web -- <cmd>  # Run any command in web container
npm run docker:exec:bot -- <cmd>  # Run any command in bot container

# Local development (without Docker for apps)
npm run docker:infra        # Start just Postgres and Redis
npm run dev -- --filter=@fightrise/bot   # Run bot locally
npm run dev -- --filter=@fightrise/web   # Run web locally

# Build
npm run build

# Run tests
npm run test               # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e           # Playwright browser tests

# Linting
npm run lint
```

---

## Testing

### Test Layers

| Layer | Command | Description |
|-------|---------|-------------|
| Unit | `npm run docker:test` | Fast tests for pure functions and utilities |
| Integration | `npm run docker:test:integration` | Tests with real database (Testcontainers) |
| E2E | `npm run docker:test:e2e` | Playwright browser tests for web portal |
| Smoke | `npm run docker:test:smoke` | Tests against real APIs |

### Prerequisites

```bash
npm run docker:infra    # Start Postgres and Redis
npm run docker:db:push  # Push database schema
```

### Test Infrastructure

- **Discord Bot**: Custom test harness with mock client, interactions, and channels
- **Start.gg API**: MSW (Mock Service Worker) for GraphQL mocking
- **Database**: Testcontainers for isolated PostgreSQL instances
- **Web E2E**: Playwright with session mocking utilities

---

## Code Patterns

### Discord Command Pattern

```typescript
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
await prisma.$transaction(async (tx) => {
  await tx.match.update({ where: { id }, data: { state: 'IN_PROGRESS' } });
  await tx.matchPlayer.updateMany({
    where: { matchId: id },
    data: { isCheckedIn: true }
  });
});
```

---

## Database Models

All 11 Prisma models:

| Model | Purpose |
|-------|---------|
| `User` | Discord/Start.gg account linking |
| `Tournament` | Tournament configuration |
| `Event` | Tournament events (games) |
| `Match` | Individual matches |
| `MatchPlayer` | Match participants |
| `GameResult` | Game-level scores |
| `Dispute` | Match disputes |
| `Registration` | Tournament registrations |
| `TournamentAdmin` | Admin roles |
| `GuildConfig` | Guild settings |
| `AuditLog` | Admin action logs |

---

## Contributing

1. Create a branch: `git checkout -b issue-<number>-<description>`
2. Make changes following the existing code patterns
3. Run tests: `npm run docker:test && npm run docker:test:integration && npm run docker:lint`
4. Create a pull request

---

## Additional Resources

- [CLAUDE.md](https://github.com/wukrit/fightrise-bot/blob/main/CLAUDE.md) - AI assistant instructions
- [Codebase Reference](https://github.com/wukrit/fightrise-bot/blob/main/docs/CODEBASE_REFERENCE.md) - Detailed code documentation
- [Architecture](Architecture) - System design
