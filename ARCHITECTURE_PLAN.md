# FightRise Tournament Bot - Architecture Plan

A comprehensive Discord bot and web portal for running Start.gg tournaments entirely within Discord.

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Technical Architecture](#technical-architecture)
3. [API Integrations](#api-integrations)
4. [Database Schema](#database-schema)
5. [Core Features Implementation](#core-features-implementation)
6. [Deployment Strategy](#deployment-strategy)
7. [Development Phases](#development-phases)

---

## Feature Overview

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Tournament Creation** | Create tournaments via web portal, synced to Start.gg |
| **Discord Authorization** | Admins link Discord servers and configure channels |
| **Match Threads** | Auto-create Discord threads for each match when ready |
| **Player Check-in** | Players check in for matches via Discord buttons |
| **Match Scoring** | Players report scores directly in Discord |
| **Registration** | Discord-based registration with Start.gg account linking |
| **Manual Registration** | Admins can add non-Start.gg users manually |
| **Match Notifications** | Players get pinged when their matches are ready |

### User Roles

1. **Tournament Admin** - Creates/manages tournaments, configures Discord integration
2. **Player** - Registers, checks in, reports scores
3. **Spectator** - Views brackets and match status (read-only)

---

## Technical Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           WEB PORTAL                                │
│                    (Next.js / React Frontend)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ Tournament  │  │   Admin     │  │    User Account             │ │
│  │ Management  │  │   Config    │  │    Management               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST/GraphQL
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVICE                              │
│                     (Node.js / TypeScript)                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Core Application                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│ │
│  │  │ Tournament  │  │  Match      │  │    Registration         ││ │
│  │  │ Service     │  │  Service    │  │    Service              ││ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘│ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│ │
│  │  │ Discord     │  │  Start.gg   │  │    Sync                 ││ │
│  │  │ Service     │  │  Service    │  │    Service              ││ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘│ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                   Discord Bot Client                           │ │
│  │              (discord.js / Slash Commands)                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
└──────────────┬─────────────────────────────────┬────────────────────┘
               │                                 │
               ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────────────┐
│      PostgreSQL          │      │         Redis                    │
│   (Primary Database)     │      │   (Cache / Job Queue)            │
└──────────────────────────┘      └──────────────────────────────────┘
               │                                 │
               └────────────┬────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Start.gg    │    │   Discord    │    │   Discord    │
│  GraphQL API │    │   REST API   │    │   Gateway    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14 (App Router) | SSR, API routes, modern React |
| **Backend** | Node.js + TypeScript | Shared types with frontend, Discord.js compatibility |
| **Discord Bot** | discord.js v14 | Official library, excellent thread/component support |
| **Database** | PostgreSQL | Relational data, ACID compliance |
| **ORM** | Prisma | Type-safe queries, migrations |
| **Cache/Queue** | Redis + BullMQ | Job queues for polling, caching |
| **Auth** | NextAuth.js | Discord & Start.gg OAuth support |
| **API** | tRPC or GraphQL Yoga | End-to-end type safety |

### Monorepo Structure

```
fightrise-bot/
├── apps/
│   ├── web/                    # Next.js web portal
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── bot/                    # Discord bot service
│       ├── commands/
│       ├── events/
│       ├── interactions/
│       └── services/
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── startgg-client/         # Start.gg API wrapper
│   ├── shared/                 # Shared types & utilities
│   └── ui/                     # Shared UI components
├── docker/
│   └── docker-compose.yml
├── turbo.json
└── package.json
```

---

## API Integrations

### Start.gg GraphQL API

**Endpoint:** `https://api.start.gg/gql/alpha`

**Authentication:** Bearer token from Start.gg Developer Settings

#### Key Queries

```graphql
# Get tournament details with events
query GetTournament($slug: String!) {
  tournament(slug: $slug) {
    id
    name
    startAt
    endAt
    events {
      id
      name
      numEntrants
      state
    }
  }
}

# Get sets (matches) for an event
query GetEventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
  event(id: $eventId) {
    sets(page: $page, perPage: $perPage, sortType: STANDARD) {
      pageInfo {
        total
        totalPages
      }
      nodes {
        id
        state           # 1=Not Started, 2=Started, 3=Completed
        fullRoundText
        identifier
        round
        slots {
          entrant {
            id
            name
            participants {
              user {
                id
                slug
              }
            }
          }
          standing {
            stats {
              score {
                value
              }
            }
          }
        }
      }
    }
  }
}

# Get event entrants
query GetEventEntrants($eventId: ID!, $page: Int!, $perPage: Int!) {
  event(id: $eventId) {
    entrants(query: { page: $page, perPage: $perPage }) {
      nodes {
        id
        name
        participants {
          user {
            id
            slug
            gamerTag
          }
        }
      }
    }
  }
}
```

#### Key Mutations

```graphql
# Report match score
mutation ReportSet($setId: ID!, $winnerId: ID!, $gameData: [BracketSetGameDataInput]) {
  reportBracketSet(setId: $setId, winnerId: $winnerId, gameData: $gameData) {
    id
    state
  }
}
```

#### Polling Strategy (No Webhooks Available)

Since Start.gg doesn't offer webhooks, implement a polling system:

```typescript
// BullMQ job for polling tournament state
interface PollTournamentJob {
  tournamentId: string;
  eventIds: string[];
  lastPolledAt: Date;
}

// Poll intervals based on tournament state
const POLL_INTERVALS = {
  INACTIVE: 5 * 60 * 1000,    // 5 minutes when not active
  ACTIVE: 15 * 1000,          // 15 seconds during active play
  MATCH_PENDING: 10 * 1000,   // 10 seconds when matches are waiting
};
```

### Discord API

**Bot Permissions Required:**
- `SEND_MESSAGES`
- `CREATE_PUBLIC_THREADS`
- `CREATE_PRIVATE_THREADS`
- `SEND_MESSAGES_IN_THREADS`
- `MANAGE_THREADS`
- `EMBED_LINKS`
- `MENTION_EVERYONE`
- `USE_APPLICATION_COMMANDS`
- `VIEW_CHANNEL`

#### Slash Commands

| Command | Description | Options |
|---------|-------------|---------|
| `/tournament setup` | Configure tournament Discord settings | tournament_slug, channel |
| `/tournament status` | View current tournament status | tournament_slug |
| `/register` | Register for a tournament | tournament_slug |
| `/link-startgg` | Link Start.gg account | - (triggers OAuth) |
| `/my-matches` | View your upcoming matches | - |
| `/checkin` | Check in for your current match | - |
| `/report` | Report match score | winner, score |

#### Thread Creation for Matches

```typescript
import { ChannelType, ThreadAutoArchiveDuration } from 'discord.js';

async function createMatchThread(
  channel: TextChannel,
  match: Match,
  players: Player[]
) {
  const thread = await channel.threads.create({
    name: `${match.roundText}: ${players[0].name} vs ${players[1].name}`,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    type: ChannelType.PublicThread,
    reason: `Match ${match.identifier} created`,
  });

  // Add players to thread
  for (const player of players) {
    if (player.discordId) {
      await thread.members.add(player.discordId);
    }
  }

  // Send match info with check-in buttons
  await thread.send({
    content: `🎮 **Match Ready!**\n\n${players.map(p => `<@${p.discordId}>`).join(' vs ')}\n\nPlease check in below:`,
    components: [createCheckInButtons(match.id, players)],
  });

  return thread;
}
```

#### Interactive Components

```typescript
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} from 'discord.js';

// Check-in buttons
function createCheckInButtons(matchId: string, players: Player[]) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    players.map((player, index) =>
      new ButtonBuilder()
        .setCustomId(`checkin:${matchId}:${player.id}`)
        .setLabel(`Check In - ${player.name}`)
        .setStyle(ButtonStyle.Primary)
    )
  );
}

// Score reporting buttons
function createScoreButtons(matchId: string, players: Player[]) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`report:${matchId}:${players[0].id}`)
      .setLabel(`${players[0].name} Wins`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`report:${matchId}:${players[1].id}`)
      .setLabel(`${players[1].name} Wins`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`dispute:${matchId}`)
      .setLabel('Dispute')
      .setStyle(ButtonStyle.Danger)
  );
}

// Detailed score entry with select menu
function createDetailedScoreEntry(matchId: string) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`score:${matchId}`)
      .setPlaceholder('Select final score...')
      .addOptions(
        { label: '2-0', value: '2-0' },
        { label: '2-1', value: '2-1' },
        { label: '3-0', value: '3-0' },
        { label: '3-1', value: '3-1' },
        { label: '3-2', value: '3-2' },
      )
  );
}
```

#### OAuth2 Flow for Account Linking

```typescript
// Discord OAuth URL
const DISCORD_OAUTH_URL = new URL('https://discord.com/api/oauth2/authorize');
DISCORD_OAUTH_URL.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID);
DISCORD_OAUTH_URL.searchParams.set('redirect_uri', process.env.DISCORD_REDIRECT_URI);
DISCORD_OAUTH_URL.searchParams.set('response_type', 'code');
DISCORD_OAUTH_URL.searchParams.set('scope', 'identify');
DISCORD_OAUTH_URL.searchParams.set('state', generateState(userId));

// Start.gg OAuth URL (similar flow)
const STARTGG_OAUTH_URL = new URL('https://start.gg/oauth/authorize');
// Configure with appropriate scopes
```

---

## Database Schema

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User account with linked services
model User {
  id              String    @id @default(cuid())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Discord identity
  discordId       String?   @unique
  discordUsername String?
  discordAvatar   String?

  // Start.gg identity
  startggId       String?   @unique
  startggSlug     String?
  startggGamerTag String?
  startggToken    String?   // Encrypted OAuth token

  // Local identity (for users without Start.gg)
  email           String?   @unique
  displayName     String?

  // Relations
  registrations   Registration[]
  matchPlayers    MatchPlayer[]
  adminTournaments TournamentAdmin[]

  @@index([discordId])
  @@index([startggId])
}

// Tournament configuration
model Tournament {
  id              String    @id @default(cuid())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Start.gg reference
  startggId       String    @unique
  startggSlug     String

  // Tournament info (cached from Start.gg)
  name            String
  startAt         DateTime?
  endAt           DateTime?
  state           TournamentState @default(CREATED)

  // Discord configuration
  discordGuildId  String?
  discordChannelId String?  // Main announcement channel

  // Settings
  autoCreateThreads    Boolean @default(true)
  requireCheckIn       Boolean @default(true)
  checkInWindowMinutes Int     @default(10)
  allowSelfReporting   Boolean @default(true)

  // Relations
  events          Event[]
  registrations   Registration[]
  admins          TournamentAdmin[]

  // Polling state
  lastPolledAt    DateTime?
  pollIntervalMs  Int       @default(30000)

  @@index([startggSlug])
  @@index([discordGuildId])
}

enum TournamentState {
  CREATED
  REGISTRATION_OPEN
  REGISTRATION_CLOSED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

// Tournament events (e.g., different games/brackets)
model Event {
  id              String    @id @default(cuid())

  // Start.gg reference
  startggId       String    @unique

  // Event info
  name            String
  numEntrants     Int       @default(0)
  state           Int       @default(1)

  // Relations
  tournamentId    String
  tournament      Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  matches         Match[]
  registrations   Registration[]

  @@index([tournamentId])
}

// Individual matches
model Match {
  id              String    @id @default(cuid())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Start.gg reference
  startggSetId    String    @unique

  // Match info
  identifier      String    // e.g., "A1", "B3"
  roundText       String    // e.g., "Winners Round 1"
  round           Int
  state           MatchState @default(NOT_STARTED)

  // Discord thread
  discordThreadId String?   @unique

  // Check-in tracking
  checkInDeadline DateTime?

  // Relations
  eventId         String
  event           Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  players         MatchPlayer[]

  @@index([eventId])
  @@index([state])
  @@index([discordThreadId])
}

enum MatchState {
  NOT_STARTED
  CALLED          // Players notified
  CHECKED_IN      // Both players checked in
  IN_PROGRESS
  PENDING_CONFIRMATION // Score reported, awaiting confirm
  COMPLETED
  DISPUTED
  DQ              // Disqualification
}

// Match participants
model MatchPlayer {
  id              String    @id @default(cuid())

  // Player info
  startggEntrantId String?
  playerName      String    // Cached name

  // Status
  isCheckedIn     Boolean   @default(false)
  checkedInAt     DateTime?
  reportedScore   Int?
  isWinner        Boolean?

  // Relations
  matchId         String
  match           Match     @relation(fields: [matchId], references: [id], onDelete: Cascade)
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])

  @@unique([matchId, startggEntrantId])
  @@index([userId])
}

// Tournament registrations
model Registration {
  id              String    @id @default(cuid())
  createdAt       DateTime  @default(now())

  // Start.gg reference
  startggEntrantId String?

  // Registration source
  source          RegistrationSource @default(DISCORD)

  // Status
  status          RegistrationStatus @default(PENDING)

  // For manual registrations without Start.gg
  displayName     String?

  // Relations
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  tournamentId    String
  tournament      Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  eventId         String?
  event           Event?    @relation(fields: [eventId], references: [id])

  @@unique([userId, eventId])
  @@index([tournamentId])
}

enum RegistrationSource {
  STARTGG         // Registered via Start.gg
  DISCORD         // Registered via Discord bot
  MANUAL          // Admin added manually
}

enum RegistrationStatus {
  PENDING         // Awaiting approval or Start.gg sync
  CONFIRMED       // Confirmed in Start.gg
  CANCELLED
  DQ
}

// Tournament administrators
model TournamentAdmin {
  id              String    @id @default(cuid())

  role            AdminRole @default(MODERATOR)

  userId          String
  user            User      @relation(fields: [userId], references: [id])
  tournamentId    String
  tournament      Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)

  @@unique([userId, tournamentId])
}

enum AdminRole {
  OWNER
  ADMIN
  MODERATOR
}

// Discord guild configuration
model GuildConfig {
  id              String    @id @default(cuid())

  discordGuildId  String    @unique

  // Default channels
  announcementChannelId String?
  matchChannelId  String?   // Where match threads are created

  // Settings
  prefix          String    @default("!")
  locale          String    @default("en")
  timezone        String    @default("UTC")

  @@index([discordGuildId])
}
```

---

## Core Features Implementation

### 1. Tournament Setup Flow

```typescript
// apps/bot/commands/tournament/setup.ts
import { SlashCommandBuilder } from 'discord.js';

export const setupCommand = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Tournament management commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up a tournament for this Discord server')
        .addStringOption(option =>
          option
            .setName('slug')
            .setDescription('Start.gg tournament slug (e.g., tournament/my-tournament)')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('match-channel')
            .setDescription('Channel where match threads will be created')
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const slug = interaction.options.getString('slug', true);
    const channel = interaction.options.getChannel('match-channel', true);
    const guildId = interaction.guildId;

    // Verify user is admin on Start.gg
    const user = await getUserWithStartgg(interaction.user.id);
    if (!user?.startggToken) {
      return interaction.editReply({
        content: 'Please link your Start.gg account first using `/link-startgg`',
      });
    }

    // Fetch tournament from Start.gg
    const tournament = await startggService.getTournament(slug, user.startggToken);
    if (!tournament) {
      return interaction.editReply({ content: 'Tournament not found on Start.gg' });
    }

    // Save configuration
    await db.tournament.upsert({
      where: { startggSlug: slug },
      create: {
        startggId: tournament.id,
        startggSlug: slug,
        name: tournament.name,
        discordGuildId: guildId,
        discordChannelId: channel.id,
        // ... other fields
      },
      update: {
        discordGuildId: guildId,
        discordChannelId: channel.id,
      },
    });

    // Start polling for this tournament
    await pollQueue.add('poll-tournament', { tournamentId: tournament.id });

    return interaction.editReply({
      content: `✅ Tournament "${tournament.name}" is now linked to this server!`,
    });
  },
};
```

### 2. Match Thread Creation & Check-in

```typescript
// apps/bot/services/matchService.ts
export class MatchService {
  async handleMatchReady(match: Match, players: MatchPlayer[]) {
    const tournament = await db.tournament.findUnique({
      where: { id: match.event.tournamentId },
    });

    if (!tournament?.discordChannelId || !tournament.autoCreateThreads) {
      return;
    }

    const channel = await bot.channels.fetch(tournament.discordChannelId);
    if (!channel?.isTextBased()) return;

    // Create thread
    const thread = await (channel as TextChannel).threads.create({
      name: `${match.roundText}: ${players[0].playerName} vs ${players[1].playerName}`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      reason: `Match ${match.identifier}`,
    });

    // Build player mentions
    const mentions = players
      .filter(p => p.user?.discordId)
      .map(p => `<@${p.user!.discordId}>`)
      .join(' vs ');

    // Calculate check-in deadline
    const checkInDeadline = tournament.requireCheckIn
      ? new Date(Date.now() + tournament.checkInWindowMinutes * 60 * 1000)
      : null;

    // Create check-in message
    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${match.roundText}`)
      .setDescription(`${players[0].playerName} vs ${players[1].playerName}`)
      .addFields(
        { name: 'Match ID', value: match.identifier, inline: true },
        { name: 'Status', value: 'Waiting for check-in', inline: true },
      )
      .setColor('#5865F2');

    if (checkInDeadline) {
      embed.addFields({
        name: 'Check-in Deadline',
        value: `<t:${Math.floor(checkInDeadline.getTime() / 1000)}:R>`,
      });
    }

    await thread.send({
      content: mentions || 'Match is ready!',
      embeds: [embed],
      components: [this.createCheckInRow(match.id, players)],
    });

    // Add players to thread
    for (const player of players) {
      if (player.user?.discordId) {
        await thread.members.add(player.user.discordId);
      }
    }

    // Update match record
    await db.match.update({
      where: { id: match.id },
      data: {
        discordThreadId: thread.id,
        state: 'CALLED',
        checkInDeadline,
      },
    });
  }

  private createCheckInRow(matchId: string, players: MatchPlayer[]) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...players.map(player =>
        new ButtonBuilder()
          .setCustomId(`checkin:${matchId}:${player.id}`)
          .setLabel(`✓ ${player.playerName}`)
          .setStyle(ButtonStyle.Primary)
      )
    );
  }
}
```

### 3. Check-in Button Handler

```typescript
// apps/bot/interactions/buttons/checkin.ts
export async function handleCheckIn(interaction: ButtonInteraction) {
  const [, matchId, playerId] = interaction.customId.split(':');

  // Verify the clicking user is the player
  const player = await db.matchPlayer.findUnique({
    where: { id: playerId },
    include: { user: true, match: true },
  });

  if (!player) {
    return interaction.reply({ content: 'Player not found', ephemeral: true });
  }

  if (player.user?.discordId !== interaction.user.id) {
    return interaction.reply({
      content: 'You can only check in for yourself!',
      ephemeral: true,
    });
  }

  if (player.isCheckedIn) {
    return interaction.reply({
      content: 'You are already checked in!',
      ephemeral: true,
    });
  }

  // Check deadline
  if (player.match.checkInDeadline && new Date() > player.match.checkInDeadline) {
    return interaction.reply({
      content: 'Check-in deadline has passed!',
      ephemeral: true,
    });
  }

  // Update check-in status
  await db.matchPlayer.update({
    where: { id: playerId },
    data: { isCheckedIn: true, checkedInAt: new Date() },
  });

  // Check if all players are checked in
  const allPlayers = await db.matchPlayer.findMany({
    where: { matchId },
  });

  const allCheckedIn = allPlayers.every(p => p.isCheckedIn);

  if (allCheckedIn) {
    // Update match state
    await db.match.update({
      where: { id: matchId },
      data: { state: 'IN_PROGRESS' },
    });

    // Update thread message with score buttons
    await interaction.update({
      content: '✅ All players checked in! Match is live.\n\nReport the winner when the match is complete:',
      components: [createScoreRow(matchId, allPlayers)],
    });
  } else {
    // Just acknowledge the check-in
    await interaction.reply({
      content: `✅ ${player.playerName} has checked in!`,
    });
  }
}
```

### 4. Score Reporting

```typescript
// apps/bot/interactions/buttons/report.ts
export async function handleScoreReport(interaction: ButtonInteraction) {
  const [, matchId, winnerPlayerId] = interaction.customId.split(':');

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { players: { include: { user: true } }, event: true },
  });

  if (!match) {
    return interaction.reply({ content: 'Match not found', ephemeral: true });
  }

  // Verify reporter is a player in the match
  const reporter = match.players.find(p => p.user?.discordId === interaction.user.id);
  if (!reporter) {
    return interaction.reply({
      content: 'Only players in this match can report scores',
      ephemeral: true,
    });
  }

  const winner = match.players.find(p => p.id === winnerPlayerId);
  if (!winner) {
    return interaction.reply({ content: 'Invalid winner selection', ephemeral: true });
  }

  // If winner is reporting themselves, need confirmation from opponent
  // If loser is reporting opponent, auto-confirm
  const reporterIsWinner = reporter.id === winnerPlayerId;

  if (reporterIsWinner) {
    // Need confirmation
    await db.match.update({
      where: { id: matchId },
      data: { state: 'PENDING_CONFIRMATION' },
    });

    await db.matchPlayer.update({
      where: { id: winner.id },
      data: { isWinner: true },
    });

    const opponent = match.players.find(p => p.id !== winnerPlayerId);

    await interaction.update({
      content: `⏳ ${winner.playerName} reported themselves as winner.\n\n<@${opponent?.user?.discordId}>, please confirm:`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm:${matchId}:${winnerPlayerId}`)
            .setLabel('Confirm Result')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`dispute:${matchId}`)
            .setLabel('Dispute')
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  } else {
    // Loser confirming opponent won - auto-submit
    await submitMatchResult(match, winner);

    await interaction.update({
      content: `✅ Match complete!\n\n🏆 **Winner:** ${winner.playerName}`,
      components: [],
    });
  }
}

async function submitMatchResult(match: Match, winner: MatchPlayer) {
  // Update local DB
  await db.match.update({
    where: { id: match.id },
    data: { state: 'COMPLETED' },
  });

  await db.matchPlayer.updateMany({
    where: { matchId: match.id },
    data: { isWinner: false },
  });

  await db.matchPlayer.update({
    where: { id: winner.id },
    data: { isWinner: true },
  });

  // Report to Start.gg
  await startggService.reportSet(
    match.startggSetId,
    winner.startggEntrantId!,
  );

  // Archive thread after delay
  setTimeout(async () => {
    if (match.discordThreadId) {
      const thread = await bot.channels.fetch(match.discordThreadId);
      if (thread?.isThread()) {
        await thread.setArchived(true);
      }
    }
  }, 60000);
}
```

### 5. Registration Flow

```typescript
// apps/bot/commands/register.ts
export const registerCommand = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register for a tournament')
    .addStringOption(option =>
      option
        .setName('tournament')
        .setDescription('Tournament to register for')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const tournaments = await db.tournament.findMany({
      where: {
        discordGuildId: interaction.guildId,
        state: 'REGISTRATION_OPEN',
      },
      take: 25,
    });

    await interaction.respond(
      tournaments.map(t => ({ name: t.name, value: t.id }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const tournamentId = interaction.options.getString('tournament', true);
    const discordUserId = interaction.user.id;

    // Check if user exists and has Start.gg linked
    let user = await db.user.findUnique({
      where: { discordId: discordUserId },
    });

    if (!user) {
      // Create local user
      user = await db.user.create({
        data: {
          discordId: discordUserId,
          discordUsername: interaction.user.username,
          displayName: interaction.user.displayName,
        },
      });
    }

    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      include: { events: true },
    });

    if (!tournament) {
      return interaction.editReply({ content: 'Tournament not found' });
    }

    // Check if already registered
    const existingReg = await db.registration.findFirst({
      where: { userId: user.id, tournamentId },
    });

    if (existingReg) {
      return interaction.editReply({ content: 'You are already registered!' });
    }

    if (user.startggId && user.startggToken) {
      // User has Start.gg - guide them to register there or use embedded widget
      const embed = new EmbedBuilder()
        .setTitle('Registration Options')
        .setDescription('You have a linked Start.gg account!')
        .addFields(
          {
            name: 'Option 1: Register on Start.gg',
            value: `[Click here to register](https://start.gg/${tournament.startggSlug}/register)`,
          },
          {
            name: 'Option 2: Register here',
            value: 'Click the button below to register directly',
          },
        );

      await interaction.editReply({
        embeds: [embed],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`register-confirm:${tournamentId}:${user.id}`)
              .setLabel('Register Now')
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      });
    } else {
      // No Start.gg account - create pending registration for admin approval
      await db.registration.create({
        data: {
          userId: user.id,
          tournamentId,
          source: 'DISCORD',
          status: 'PENDING',
          displayName: user.displayName || interaction.user.username,
        },
      });

      await interaction.editReply({
        content: '✅ Registration submitted!\n\nSince you don\'t have a Start.gg account linked, a tournament admin will need to approve your registration.\n\nWant to link your Start.gg account? Use `/link-startgg`',
      });

      // Notify admins
      await notifyTournamentAdmins(tournament, `New registration pending: ${user.displayName}`);
    }
  },
};
```

### 6. Polling Service

```typescript
// apps/bot/services/pollService.ts
import { Queue, Worker } from 'bullmq';

const pollQueue = new Queue('tournament-polling', { connection: redis });

const pollWorker = new Worker(
  'tournament-polling',
  async (job) => {
    const { tournamentId } = job.data;

    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      include: { events: true },
    });

    if (!tournament || tournament.state === 'COMPLETED') {
      return; // Don't reschedule
    }

    // Fetch current state from Start.gg
    for (const event of tournament.events) {
      const sets = await startggService.getEventSets(event.startggId);

      for (const set of sets) {
        await processSetUpdate(tournament, event, set);
      }
    }

    // Update last polled timestamp
    await db.tournament.update({
      where: { id: tournamentId },
      data: { lastPolledAt: new Date() },
    });

    // Reschedule based on tournament state
    const interval = calculatePollInterval(tournament);
    await pollQueue.add(
      'poll-tournament',
      { tournamentId },
      { delay: interval }
    );
  },
  { connection: redis }
);

async function processSetUpdate(tournament: Tournament, event: Event, set: StartGGSet) {
  const existingMatch = await db.match.findUnique({
    where: { startggSetId: set.id },
    include: { players: true },
  });

  if (!existingMatch) {
    // New match - create it
    if (set.state >= 2) { // Started or ready
      const match = await createMatch(event, set);
      await matchService.handleMatchReady(match, match.players);
    }
    return;
  }

  // Check for state changes
  if (set.state === 3 && existingMatch.state !== 'COMPLETED') {
    // Match completed on Start.gg (maybe reported there directly)
    await syncCompletedMatch(existingMatch, set);
  }
}

function calculatePollInterval(tournament: Tournament): number {
  switch (tournament.state) {
    case 'IN_PROGRESS':
      return 15000; // 15 seconds
    case 'REGISTRATION_OPEN':
      return 60000; // 1 minute
    default:
      return 300000; // 5 minutes
  }
}
```

---

## Deployment Strategy

### Infrastructure Options

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Railway** | Easy deploys, GitHub integration | Limited free tier | ~$5-20/mo |
| **Fly.io** | No cold starts, global edge | More complex setup | ~$5-15/mo |
| **Render** | Simple, managed Postgres | Sleep mode on free | ~$7-25/mo |
| **DigitalOcean App Platform** | Predictable pricing | Less auto-scaling | ~$12-25/mo |
| **Self-hosted VPS** | Full control | More maintenance | ~$5-10/mo |

### Recommended: Railway

```yaml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/health"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[[services]]
name = "bot"
startCommand = "npm run start:bot"

[[services]]
name = "web"
startCommand = "npm run start:web"
```

### Docker Compose (Development/Self-hosted)

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: fightrise
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: fightrise
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  bot:
    build:
      context: ..
      dockerfile: docker/Dockerfile.bot
    environment:
      DATABASE_URL: postgresql://fightrise:${DB_PASSWORD}@postgres:5432/fightrise
      REDIS_URL: redis://redis:6379
      DISCORD_TOKEN: ${DISCORD_TOKEN}
      STARTGG_API_KEY: ${STARTGG_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    environment:
      DATABASE_URL: postgresql://fightrise:${DB_PASSWORD}@postgres:5432/fightrise
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

### Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/fightrise"

# Redis
REDIS_URL="redis://localhost:6379"

# Discord
DISCORD_TOKEN="your-bot-token"
DISCORD_CLIENT_ID="your-client-id"
DISCORD_CLIENT_SECRET="your-client-secret"

# Start.gg
STARTGG_API_KEY="your-startgg-api-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secret"

# OAuth Redirect URIs
DISCORD_REDIRECT_URI="http://localhost:3000/api/auth/callback/discord"
```

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up monorepo with Turborepo
- [ ] Initialize Prisma with database schema
- [ ] Create basic Discord bot with slash command registration
- [ ] Implement Start.gg API client with basic queries
- [ ] Set up NextAuth with Discord OAuth

### Phase 2: Core Bot Features (Weeks 3-4)
- [ ] `/tournament setup` command
- [ ] Start.gg polling service with BullMQ
- [ ] Match thread creation
- [ ] Check-in button interactions
- [ ] Basic score reporting

### Phase 3: Registration System (Weeks 5-6)
- [ ] `/register` command
- [ ] `/link-startgg` OAuth flow
- [ ] Admin manual registration
- [ ] Registration approval workflow
- [ ] Sync registrations to Start.gg (if API supports)

### Phase 4: Web Portal (Weeks 7-8)
- [ ] Dashboard with tournament list
- [ ] Tournament configuration page
- [ ] User account management
- [ ] Admin registration management
- [ ] Real-time match status view

### Phase 5: Polish & Advanced Features (Weeks 9-10)
- [ ] Match dispute system
- [ ] DQ handling
- [ ] Bracket visualization (embed Start.gg or custom)
- [ ] Notification preferences
- [ ] Mobile-friendly web portal

### Phase 6: Testing & Launch (Weeks 11-12)
- [ ] Integration testing
- [ ] Load testing polling system
- [ ] Beta testing with real tournaments
- [ ] Documentation
- [ ] Production deployment

---

## Additional Considerations

### Rate Limiting

**Start.gg:**
- Implement exponential backoff
- Cache frequently accessed data
- Batch queries where possible

**Discord:**
- Use built-in discord.js rate limit handling
- Queue bulk operations (thread creation, member adds)

### Error Handling

- Graceful degradation if Start.gg is unavailable
- Retry logic for transient failures
- Admin notifications for critical errors
- Audit logging for all score reports

### Security

- Encrypt OAuth tokens at rest
- Validate all button interaction sources
- Rate limit user actions
- Audit trail for administrative actions

---

## Resources

- [Start.gg Developer Portal](https://developer.start.gg/docs/intro/)
- [Start.gg GraphQL Schema](https://smashgg-schema.netlify.app/)
- [Discord.js Guide](https://discordjs.guide/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
